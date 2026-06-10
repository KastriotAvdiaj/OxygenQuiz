using System.Linq.Expressions;

namespace QuizAPI.Filtering
{
    /// <summary>
    /// Describes one field of entity <typeparamref name="T"/> that clients are allowed to
    /// filter and/or sort on. The <see cref="Selector"/> is a strongly-typed member access
    /// (e.g. q =&gt; q.CreatedAt); the engine builds EF-translatable predicates from it.
    /// </summary>
    public sealed class FilterableField<T>
    {
        public required string Name { get; init; }

        /// <summary>Member selector, stored as a LambdaExpression so fields of different
        /// property types can live in one collection. Its body type drives value parsing.</summary>
        public required LambdaExpression Selector { get; init; }

        /// <summary>Operators permitted on this field. A rule using any other operator is ignored.</summary>
        public required HashSet<FilterOperator> AllowedOperators { get; init; }

        /// <summary>Included in free-text <c>search</c> (string fields only).</summary>
        public bool Searchable { get; init; }

        /// <summary>May be used in the <c>sort</c> spec.</summary>
        public bool Sortable { get; init; }
    }

    /// <summary>
    /// A per-entity registry of filterable fields — the security boundary of the whole
    /// framework. Only fields registered here can be filtered, searched or sorted, so
    /// arbitrary client input can never reach an unintended column. Define one static
    /// instance per entity (see QuestionFilterFields) and pass it to the engine.
    /// </summary>
    public sealed class FilterFieldSet<T>
    {
        private readonly Dictionary<string, FilterableField<T>> _fields =
            new(StringComparer.OrdinalIgnoreCase);

        private FilterableField<T>? _defaultSort;

        public FilterFieldSet<T> Field<TProp>(
            string name,
            Expression<Func<T, TProp>> selector,
            FilterOperator[] operators,
            bool searchable = false,
            bool sortable = false,
            bool defaultSort = false)
        {
            var field = new FilterableField<T>
            {
                Name = name,
                Selector = selector,
                AllowedOperators = new HashSet<FilterOperator>(operators),
                Searchable = searchable,
                Sortable = sortable || defaultSort,
            };
            _fields[name] = field;
            if (defaultSort) _defaultSort = field;
            return this;
        }

        public bool TryGet(string name, out FilterableField<T> field) =>
            _fields.TryGetValue(name, out field!);

        public IEnumerable<FilterableField<T>> Searchable =>
            _fields.Values.Where(f => f.Searchable);

        /// <summary>Stable, deterministic sort applied when the client supplies none (and as
        /// the final tie-breaker). Set via <c>defaultSort: true</c>; null if none was marked.</summary>
        public FilterableField<T>? DefaultSort => _defaultSort;
    }
}
