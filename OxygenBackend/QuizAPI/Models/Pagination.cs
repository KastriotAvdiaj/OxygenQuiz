using Microsoft.EntityFrameworkCore;

namespace QuizAPI.Models
{
    public class PaginationParams
    {
        private const int MaxPageSize = 50;
        private int _pageSize = 20;

        public int PageNumber { get; set; } = 1;

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = (value > MaxPageSize) ? MaxPageSize : value;
        }
    }

    public class QuestionFilterParams : PaginationParams
    {
        public string? SearchTerm { get; set; }
        public int? CategoryId { get; set; }
        public int? DifficultyId { get; set; }
        public int? LanguageId { get; set; }
        public string? Visibility { get; set; }
        public QuestionType? Type { get; set; }
        public Guid? UserId { get; set; }
    }

    public class PagedList<T>
    {
        public List<T> Items { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;

        public PagedList(List<T> items, int count, int pageNumber, int pageSize)
        {
            Items = items;
            TotalCount = count;
            PageNumber = pageNumber;
            PageSize = pageSize;
        }

        public static async Task<PagedList<T>> CreateAsync(IQueryable<T> source, int pageNumber, int pageSize)
        {
            const int MaxPageSize = 50;
            pageSize = pageSize > MaxPageSize ? MaxPageSize : pageSize;

            var count = await source.CountAsync();
            var items = await source.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedList<T>(items, count, pageNumber, pageSize);
        }
    }
}
