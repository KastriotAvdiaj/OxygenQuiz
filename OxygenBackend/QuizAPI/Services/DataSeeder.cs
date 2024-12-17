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
            SeedQuestions();
        }

     
        private void SeedQuestions()
        {
            if (!_context.Questions.Any())
            {
                // Create a Faker for AnswerOptions
                var answerOptionFaker = new Faker<AnswerOption>()
                    .RuleFor(a => a.Text, f => f.Lorem.Sentence())
                    .RuleFor(a => a.IsCorrect, f => f.Random.Bool(0.25f)); // 25% chance of being correct

                // Create a Faker for Questions
                var questionFaker = new Faker<Question>()
                    .RuleFor(q => q.Text, f => f.Lorem.Paragraph())
                    .RuleFor(q => q.Difficulty, f => f.PickRandom<DifficultyLevel>()) // Assuming Difficulty is an enum
                    .RuleFor(q => q.CreatedAt, f => DateTime.UtcNow)
                    .RuleFor(q => q.CategoryId, f =>
                    {
                        // Pick a random existing category
                        var category = _context.QuestionCategories
                            .OrderBy(c => Guid.NewGuid())
                            .FirstOrDefault();
                        return category.Id;
                    })
                    .RuleFor(q => q.UserId, f => Guid.NewGuid()) // Replace with actual user ID if needed
                    .RuleFor(q => q.AnswerOptions, f => answerOptionFaker.Generate(4)); // Generate 4 options per question

                var questions = questionFaker.Generate(3);

                _context.Questions.AddRange(questions);
                _context.SaveChanges();
            }
        }
    }
}
