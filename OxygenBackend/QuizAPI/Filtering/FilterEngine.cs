using System.Collections;
using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;

namespace QuizAPI.Filtering
{
    /// <summary>
    /// Applies a <see cref="FilterQuery"/> to an <see cref="IQueryable{T}"/> using a
    /// per-entity <see cref="FilterFieldSet{T}"/> whitelist. Everything it produces is an
    /// expression tree, so it composes into the EF query and runs in SQL — no client-side
    /// evaluation, no string concatenation, no SQL injection surface.
    ///
    /// Unknown fields, disallowed operators and unparseable values are silently skipped
    /// rather than throwing, so malformed client input degrades to "no extra filter"
    /// instead of a 500.
    /// </summary>
    public static class FilterEngine
    {
        private static readonly MethodInfo StringToLower =
            typeof(string).GetMethod(nameof(string.ToLower), System.Type.EmptyTypes)!;
        private static readonly MethodInfo StringContains =
            typeof(string).GetMethod(nameof(string.Contains), new[] { typeof(string) })!;
        private static readonly MethodInfo StringStartsWith =
            typeof(string).GetMethod(nameof(string.StartsWith), new[] { typeof(string) })!;

        public static IQueryable<T> Apply<T>(
            IQueryable<T> source, FilterQuery query, FilterFieldSet<T> fields)
        {
            source = ApplyFilters(source, query, fields);
            source = ApplySearch(source, query.Search, fields);
            source = ApplySort(source, query.Sort, fields);
            return source;
        }

        // ── filters ────────────────────────────────────────────────────────────
        private static IQueryable<T> ApplyFilters<T>(
            IQueryable<T> source, FilterQuery query, FilterFieldSet<T> fields)
        {
            foreach (var raw in query.Filter)
            {
                if (!FilterRule.TryParse(raw, out var rule)) continue;
                if (!fields.TryGet(rule.Field, out var field)) continue;
                if (!field.AllowedOperators.Contains(rule.Operator)) continue;

                var predicate = BuildPredicate(field, rule);
                if (predicate != null) source = source.Where(predicate);
            }
            return source;
        }

        private static Expression<Func<T, bool>>? BuildPredicate<T>(
            FilterableField<T> field, FilterRule rule)
        {
            var param = field.Selector.Parameters[0];
            var member = field.Selector.Body;
            var memberType = member.Type;
            var underlying = Nullable.GetUnderlyingType(memberType) ?? memberType;

            try
            {
                Expression body;
                switch (rule.Operator)
                {
                    case FilterOperator.Eq:
                        body = Expression.Equal(member, ConstantOf(rule.Values[0], memberType, underlying));
                        break;
                    case FilterOperator.Neq:
                        body = Expression.NotEqual(member, ConstantOf(rule.Values[0], memberType, underlying));
                        break;
                    case FilterOperator.Gt:
                        body = Expression.GreaterThan(member, ConstantOf(rule.Values[0], memberType, underlying));
                        break;
                    case FilterOperator.Gte:
                        body = Expression.GreaterThanOrEqual(member, ConstantOf(rule.Values[0], memberType, underlying));
                        break;
                    case FilterOperator.Lt:
                        body = Expression.LessThan(member, ConstantOf(rule.Values[0], memberType, underlying));
                        break;
                    case FilterOperator.Lte:
                        body = Expression.LessThanOrEqual(member, ConstantOf(rule.Values[0], memberType, underlying));
                        break;
                    case FilterOperator.Between:
                        if (rule.Values.Count < 2) return null;
                        body = Expression.AndAlso(
                            Expression.GreaterThanOrEqual(member, ConstantOf(rule.Values[0], memberType, underlying)),
                            Expression.LessThanOrEqual(member, ConstantOf(rule.Values[1], memberType, underlying)));
                        break;
                    case FilterOperator.In:
                        body = BuildInExpression(member, memberType, underlying, rule.Values);
                        break;
                    case FilterOperator.Contains:
                        if (underlying != typeof(string)) return null;
                        body = BuildStringCall(member, rule.Values[0], StringContains);
                        break;
                    case FilterOperator.StartsWith:
                        if (underlying != typeof(string)) return null;
                        body = BuildStringCall(member, rule.Values[0], StringStartsWith);
                        break;
                    default:
                        return null;
                }

                return Expression.Lambda<Func<T, bool>>(body, param);
            }
            catch
            {
                // Bad value for this field's type — skip the rule instead of failing.
                return null;
            }
        }

        // member.ToLower().Call(constant.ToLower()) — case-insensitive string match.
        private static Expression BuildStringCall(Expression member, string value, MethodInfo method)
        {
            var lowerMember = Expression.Call(member, StringToLower);
            var constant = Expression.Constant(value.ToLowerInvariant(), typeof(string));
            return Expression.Call(lowerMember, method, constant);
        }

        // values.Contains(member) — builds a typed List<memberType> the provider can translate.
        private static Expression BuildInExpression(
            Expression member, System.Type memberType, System.Type underlying, IReadOnlyList<string> values)
        {
            var listType = typeof(List<>).MakeGenericType(memberType);
            var list = (IList)System.Activator.CreateInstance(listType)!;
            foreach (var v in values)
                list.Add(ConvertValue(v, underlying, memberType));

            var contains = typeof(Enumerable).GetMethods()
                .First(m => m.Name == nameof(Enumerable.Contains) && m.GetParameters().Length == 2)
                .MakeGenericMethod(memberType);

            return Expression.Call(contains, Expression.Constant(list, listType), member);
        }

        private static ConstantExpression ConstantOf(string raw, System.Type memberType, System.Type underlying) =>
            Expression.Constant(ConvertValue(raw, underlying, memberType), memberType);

        // Parses a raw string to the field's underlying type, then boxes it as the member
        // type (which may be Nullable<>). Throwing here is caught and turns into a skip.
        private static object ConvertValue(string raw, System.Type underlying, System.Type memberType)
        {
            object value;
            if (underlying == typeof(string)) value = raw;
            else if (underlying == typeof(Guid)) value = Guid.Parse(raw);
            else if (underlying == typeof(bool)) value = bool.Parse(raw);
            else if (underlying.IsEnum) value = System.Enum.Parse(underlying, raw, ignoreCase: true);
            else if (underlying == typeof(DateTime))
                value = DateTime.Parse(raw, CultureInfo.InvariantCulture,
                    DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
            else if (underlying == typeof(DateTimeOffset))
                value = DateTimeOffset.Parse(raw, CultureInfo.InvariantCulture);
            else
                value = System.Convert.ChangeType(raw, underlying, CultureInfo.InvariantCulture);

            return value; // boxed; assignable to memberType (incl. Nullable<>) for Expression.Constant
        }

        // ── search ─────────────────────────────────────────────────────────────
        private static IQueryable<T> ApplySearch<T>(
            IQueryable<T> source, string? search, FilterFieldSet<T> fields)
        {
            if (string.IsNullOrWhiteSpace(search)) return source;

            var term = Expression.Constant(search.Trim().ToLowerInvariant(), typeof(string));
            var param = Expression.Parameter(typeof(T), "x");
            Expression? combined = null;

            foreach (var field in fields.Searchable)
            {
                // Rebind each field's selector onto our single shared parameter.
                var member = new ParameterReplacer(field.Selector.Parameters[0], param)
                    .Visit(field.Selector.Body)!;
                var contains = Expression.Call(
                    Expression.Call(member, StringToLower), StringContains, term);
                combined = combined == null ? contains : Expression.OrElse(combined, contains);
            }

            if (combined == null) return source; // no searchable fields configured
            return source.Where(Expression.Lambda<Func<T, bool>>(combined, param));
        }

        // ── sort ───────────────────────────────────────────────────────────────
        private static IQueryable<T> ApplySort<T>(
            IQueryable<T> source, string? sort, FilterFieldSet<T> fields)
        {
            var applied = false;

            foreach (var clause in (sort ?? string.Empty)
                .Split(',', System.StringSplitOptions.RemoveEmptyEntries | System.StringSplitOptions.TrimEntries))
            {
                var parts = clause.Split(':', 2);
                if (!fields.TryGet(parts[0], out var field) || !field.Sortable) continue;
                var desc = parts.Length > 1 && parts[1].Equals("desc", System.StringComparison.OrdinalIgnoreCase);
                source = ApplyOrder(source, field.Selector, desc, first: !applied);
                applied = true;
            }

            if (!applied && fields.DefaultSort is { } def)
                source = ApplyOrder(source, def.Selector, desc: true, first: true);

            return source;
        }

        private static IQueryable<T> ApplyOrder<T>(
            IQueryable<T> source, LambdaExpression selector, bool desc, bool first)
        {
            var method = first
                ? (desc ? nameof(Queryable.OrderByDescending) : nameof(Queryable.OrderBy))
                : (desc ? nameof(Queryable.ThenByDescending) : nameof(Queryable.ThenBy));

            var call = Expression.Call(
                typeof(Queryable), method,
                new[] { typeof(T), selector.Body.Type },
                source.Expression, Expression.Quote(selector));

            return source.Provider.CreateQuery<T>(call);
        }

        private sealed class ParameterReplacer : ExpressionVisitor
        {
            private readonly ParameterExpression _from;
            private readonly ParameterExpression _to;
            public ParameterReplacer(ParameterExpression from, ParameterExpression to)
            {
                _from = from;
                _to = to;
            }
            protected override Expression VisitParameter(ParameterExpression node) =>
                node == _from ? _to : base.VisitParameter(node);
        }
    }
}
