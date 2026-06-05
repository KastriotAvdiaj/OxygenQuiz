using QuizAPI.Models;
using System.Text.Json;

namespace QuizAPI.Extensions
{
    public static class HttpExtensions
    {
        public static void AddPaginationHeader(this HttpResponse response, int currentPage,
            int itemsPerPage, int totalItems, int totalPages, bool hasNextPage, bool hasPreviousPage)
        {
            var paginationHeader = new
            {
                currentPage,
                itemsPerPage,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage
            };

            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            response.Headers.Append("Pagination", JsonSerializer.Serialize(paginationHeader, options));
        }

        public static void AddPaginationHeader<T>(this HttpResponse response, PagedList<T> pagedList)
        {
            response.AddPaginationHeader(
                pagedList.PageNumber,
                pagedList.PageSize,
                pagedList.TotalCount,
                pagedList.TotalPages,
                pagedList.HasNextPage,
                pagedList.HasPreviousPage);
        }
    }
}
