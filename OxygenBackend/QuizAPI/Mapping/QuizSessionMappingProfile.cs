﻿using AutoMapper;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Mapping
{
    public class QuizSessionMappingProfile : Profile
    {
        public QuizSessionMappingProfile()
        {

            // --- QuizSession Mappings ---

            CreateMap<QuizSessionCM, QuizSession>();

            CreateMap<QuizSession, QuizSessionDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.IsCompleted));

            CreateMap<QuizSession, QuizSessionSummaryDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.TotalQuestions, opt => opt.MapFrom(src => src.Quiz.QuizQuestions.Count))
                .ForMember(dest => dest.CorrectAnswers, opt => opt.MapFrom(src => src.UserAnswers.Count(ua => ua.Status == AnswerStatus.Correct)))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.IsCompleted))
                .ForMember(dest => dest.Duration, opt => opt.MapFrom(src =>
                    src.EndTime.HasValue ? (src.EndTime.Value - src.StartTime) : (TimeSpan?)null));


            // --- UserAnswer Mappings ---

            CreateMap<UserAnswerCM, UserAnswer>();

            CreateMap<UserAnswer, UserAnswerDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
                .ForMember(dest => dest.QuestionText, opt => opt.MapFrom(src => src.QuizQuestion.Question.Text))
                .ForMember(dest => dest.SelectedOptionText, opt => opt.MapFrom(src => src.AnswerOption != null ? src.AnswerOption.Text : null));

            // --- New Mappings for Live Quiz Flow ---


            CreateMap<QuizQuestion, CurrentQuestionDto>()
              .ForMember(dest => dest.QuizQuestionId, opt => opt.MapFrom(src => src.Id))
              .ForMember(dest => dest.QuestionText, opt => opt.MapFrom(src => src.Question.Text))
              .ForMember(dest => dest.TimeLimitInSeconds, opt => opt.MapFrom(src => src.TimeLimitInSeconds))
              .ForMember(dest => dest.TimeRemainingInSeconds, opt => opt.Ignore()) // Still ignore this, it's calculated in the service
              .ForMember(dest => dest.QuestionType, opt => opt.MapFrom(src => src.Question.Type))
             /* .ForMember(dest => dest.Explanation, opt => opt.MapFrom(src => src.Explanation))*/
              .ForMember(dest => dest.Options, opt => opt.MapFrom((src, dest, destMember, context) =>
                  {
                      // Check if the question is a MultipleChoiceQuestion
                      if (src.Question is MultipleChoiceQuestion mcq)
                      {
                          // Use the injected IMapper from the context to map the collection
                          return context.Mapper.Map<List<AnswerOptionDTO>>(mcq.AnswerOptions);
                      }

                      // Check if the question is a TrueFalseQuestion
                      if (src.Question is TrueFalseQuestion tfq)
                      {
                          // True/False questions don't have AnswerOption entities, so we create them on the fly.
                          // We need a way to link back to the correct answer. Let's assume you have a property
                          // `IsCorrectAnswerTrue` on the TrueFalseQuestion entity.
                          // NOTE: You'll need to create AnswerOptionDto with appropriate IDs. For T/F, the concept
                          // of an AnswerOption ID is tricky. We can use a convention like 1 for True, 0 for False.
                          return new List<AnswerOptionDTO>
                          {
                            new AnswerOptionDTO { ID = 1, Text = "True", IsCorrect = tfq.CorrectAnswer },
                            new AnswerOptionDTO { ID = 0, Text = "False", IsCorrect = !tfq.CorrectAnswer }
                          };
                      }

                      // For other question types like TypeTheAnswerQuestion, return an empty list.
                      return new List<AnswerOptionDTO>();
                  }));
        }

    }
}
