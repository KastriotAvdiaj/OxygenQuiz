using System;
using System.Collections.Generic;
using QuizAPI.Models;

namespace QuizAPI.DTOs.Shared
{
    public class DashboardPaginatedResponse<T>
    {
        public string Mode { get; set; } = string.Empty;
        public IEnumerable<T> Data { get; set; } = Array.Empty<T>();
        public PaginationMetadata Pagination { get; set; } = new PaginationMetadata();

        public static DashboardPaginatedResponse<T> FromPagedList(PagedList<T> pagedList, string mode)
        {
            return new DashboardPaginatedResponse<T>
            {
                Mode = mode,
                Data = pagedList.Items,
                Pagination = PaginationMetadata.FromPagedList(pagedList)
            };
        }
    }

    public class PaginationMetadata
    {
        public int CurrentPage { get; set; }
        public int ItemsPerPage { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }

        public static PaginationMetadata FromPagedList<T>(PagedList<T> pagedList)
        {
            return new PaginationMetadata
            {
                CurrentPage = pagedList.PageNumber,
                ItemsPerPage = pagedList.PageSize,
                TotalItems = pagedList.TotalCount,
                TotalPages = pagedList.TotalPages,
                HasNextPage = pagedList.HasNextPage,
                HasPreviousPage = pagedList.HasPreviousPage
            };
        }
    }
}
