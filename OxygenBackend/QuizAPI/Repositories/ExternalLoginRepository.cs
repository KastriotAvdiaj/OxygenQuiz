using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class ExternalLoginRepository : IExternalLoginRepository
    {
        private readonly ApplicationDbContext _context;

        public ExternalLoginRepository(ApplicationDbContext context) => _context = context;

        public Task<ExternalLogin?> GetByProviderSubjectAsync(
            string provider, string providerSubjectId, CancellationToken ct = default) =>
            _context.ExternalLogins
                .FirstOrDefaultAsync(el =>
                    el.Provider == provider &&
                    el.ProviderSubjectId == providerSubjectId, ct);

        public async Task AddAsync(ExternalLogin login, CancellationToken ct = default) =>
            await _context.ExternalLogins.AddAsync(login, ct);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
