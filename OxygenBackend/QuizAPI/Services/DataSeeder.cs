using Bogus;
using QuizAPI.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace QuizAPI.Data
{
    public class DataSeeder
    {
        private readonly ApplicationDbContext _context;

        public DataSeeder(ApplicationDbContext context)
        {
            _context = context;
        }

        public void SeedData()
        {
        }

  
        
    }
}
