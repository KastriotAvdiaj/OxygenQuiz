﻿using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services.AnswerOptions
{
    public class AnswerOptionService: IAnswerOptionService      
    {
        private readonly ApplicationDbContext _context;

        public AnswerOptionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AnswerOption> CreateAnswerOptionAsync(
      AnswerOptionCM newAnswerOptionCM,
      int questionId
  )
        {
            // First, fetch the base question
            var baseQuestion = await _context.Questions.FirstOrDefaultAsync(q => q.Id == questionId)
                ?? throw new Exception("Question not found.");

            // Check if it's a MultipleChoiceQuestion
            if (baseQuestion.Type != QuestionType.MultipleChoice)
            {
                throw new InvalidOperationException("Answer options can only be added to multiple choice questions.");
            }

            // Now fetch the full MultipleChoiceQuestion with its options
            var multipleChoiceQuestion = await _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == questionId)
                ?? throw new Exception("Multiple choice question not found.");

            // Create and add the answer option
            var answerOption = new AnswerOption
            {
                Text = newAnswerOptionCM.Text,
                IsCorrect = newAnswerOptionCM.IsCorrect,
                QuestionId = questionId // Assuming you have a QuestionId property in AnswerOption
            };

            _context.AnswerOptions.Add(answerOption);
            multipleChoiceQuestion.AnswerOptions.Add(answerOption);
            await _context.SaveChangesAsync();

            return answerOption;
        }

        public async Task<List<AnswerOption>> CreateAnswerOptionsAsync(
            List<AnswerOptionCM> newAnswerOptions,
            int questionId
        )
        {
            var createdOptions = new List<AnswerOption>();

           
            foreach (var optionDto in newAnswerOptions)
            {
                var createdOption = await CreateAnswerOptionAsync(optionDto, questionId);
                createdOptions.Add(createdOption);
            }

            return createdOptions;
        }

        /*
        ------------
        Not being used at the moment since the logic is a little complex.
        ------------
        */
        public async Task<AnswerOption> UpdateAnswerOptionAsync(AnswerOption updatedAnswerOption)
        {
            
            var existingAnswerOption = await _context.AnswerOptions
                .FirstOrDefaultAsync(a => a.Id == updatedAnswerOption.Id);

            if (existingAnswerOption == null)
            {
                throw new Exception("Answer option not found.");
            }

            if (existingAnswerOption.Text == updatedAnswerOption.Text &&
        existingAnswerOption.IsCorrect == updatedAnswerOption.IsCorrect)
            {
                return existingAnswerOption;
            }

            existingAnswerOption.Text = updatedAnswerOption.Text;
            existingAnswerOption.IsCorrect = updatedAnswerOption.IsCorrect;

            await _context.SaveChangesAsync();

            return existingAnswerOption;
        }
    }
}
