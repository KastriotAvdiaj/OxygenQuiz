namespace QuizAPI.Filtering
{
    /// <summary>
    /// The operators a filter rule may use. Each filterable field whitelists the subset
    /// that makes sense for it (see <see cref="FilterFieldSet{T}"/>), so a client can never
    /// run, say, a Contains on an integer column.
    /// </summary>
    public enum FilterOperator
    {
        Eq,         // equals
        Neq,        // not equals
        Contains,   // string contains (case-insensitive)
        StartsWith, // string starts-with (case-insensitive)
        Gt,         // greater than
        Gte,        // greater than or equal
        Lt,         // less than
        Lte,        // less than or equal
        In,         // value in a set            (values: a,b,c)
        Between     // value within a range       (values: from,to)
    }

    /// <summary>
    /// One parsed filter condition, e.g. {Field:"createdAt", Operator:Between,
    /// Values:["2026-01-01","2026-03-31"]}. Produced from the wire format
    /// "field:op:value[,value2]" by <see cref="FilterRule.TryParse"/>.
    /// </summary>
    public sealed class FilterRule
    {
        public string Field { get; init; } = string.Empty;
        public FilterOperator Operator { get; init; }
        public IReadOnlyList<string> Values { get; init; } = System.Array.Empty<string>();

        /// <summary>
        /// Parses one raw rule. Format: "field:operator:value" where value may be a
        /// comma-separated list (for In / Between). Returns false on anything malformed
        /// so the engine can simply skip it rather than throw on user input.
        /// </summary>
        public static bool TryParse(string? raw, out FilterRule rule)
        {
            rule = new FilterRule();
            if (string.IsNullOrWhiteSpace(raw)) return false;

            // Split into exactly three parts: field, operator, value(s).
            // The value itself may contain ':' (e.g. a timestamp), so limit to 3.
            var parts = raw.Split(':', 3);
            if (parts.Length < 3) return false;

            if (!System.Enum.TryParse<FilterOperator>(parts[1], ignoreCase: true, out var op))
                return false;

            var values = parts[2]
                .Split(',', System.StringSplitOptions.RemoveEmptyEntries | System.StringSplitOptions.TrimEntries);
            if (values.Length == 0) return false;

            rule = new FilterRule { Field = parts[0].Trim(), Operator = op, Values = values };
            return true;
        }
    }

    /// <summary>
    /// The generic, entity-agnostic query a filtered list endpoint binds from the query
    /// string. Bind it with [FromQuery]. Example:
    ///   ?search=capital&amp;filter=userId:eq:GUID&amp;filter=createdAt:between:2026-01-01,2026-03-31
    ///   &amp;sort=createdAt:desc&amp;page=1&amp;pageSize=20
    /// </summary>
    public sealed class FilterQuery
    {
        private const int MaxPageSize = 100;
        private int _pageSize = 20;

        public int Page { get; set; } = 1;

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value < 1 ? 20 : System.Math.Min(value, MaxPageSize);
        }

        /// <summary>Free-text search applied across the entity's searchable fields.</summary>
        public string? Search { get; set; }

        /// <summary>Comma-separated sort spec, e.g. "createdAt:desc,text:asc".</summary>
        public string? Sort { get; set; }

        /// <summary>
        /// Raw filter rules, repeated in the query string as filter=field:op:value.
        /// Kept raw here; parsed + validated against the field whitelist by the engine.
        /// </summary>
        public List<string> Filter { get; set; } = new();
    }
}
