using QuizAPI.Data;

namespace QuizAPI.Services
{
    public class DashboardService
    {

        private readonly ApplicationDbContext _context;

        public DashboardService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Generic method to get the count of any entity
        public int GetTotalCount<T>() where T : class
        {
            // Use reflection to get the DbSet for the specific type
            var dbSet = _context.Set<T>();
            return dbSet.Count();
        }

    }
}
