using AutoMapper;
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

            CreateMap<QuizSession, QuizSessionSummaryDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.TotalQuestions, opt => opt.MapFrom(src => src.Quiz.QuizQuestions.Count))
                .ForMember(dest => dest.CorrectAnswers, opt => opt.MapFrom(src => src.UserAnswers.Count(ua => ua.Status == AnswerStatus.Correct)))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.IsCompleted))
                .ForMember(dest => dest.Duration, opt => opt.MapFrom(src =>
                    src.EndTime.HasValue ? (src.EndTime.Value - src.StartTime) : (TimeSpan?)null))
                .ForMember(dest => dest.AbandonmentReason, opt => opt.MapFrom(src => src.AbandonmentReason))
                .ForMember(dest => dest.AbandonedAt, opt => opt.MapFrom(src => src.AbandonedAt)); ;

            CreateMap<QuizSession, QuizSessionDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.IsCompleted))
                .ForMember(dest => dest.AbandonmentReason, opt => opt.MapFrom(src => src.AbandonmentReason))
                .ForMember(dest => dest.AbandonedAt, opt => opt.MapFrom(src => src.AbandonedAt))
                .ForMember(dest => dest.HasInstantFeedback, opt => opt.MapFrom(src => src.Quiz.ShowFeedbackImmediately))
                .ForMember(dest => dest.QuizDescription, opt => opt.MapFrom(src => src.Quiz.Description))
                .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Quiz.Category.Name))
                .ForMember(dest => dest.TotalQuestions, opt => opt.MapFrom(src => src.Quiz.QuizQuestions.Count))
                .ForMember(dest => dest.UserAnswers, opt => opt.MapFrom(src => src.UserAnswers.OrderBy(ua => ua.QuizQuestion.OrderInQuiz)));

            /*OLD QUIZ SESSION MAPPING*/
            /*CreateMap<QuizSession, QuizSessionDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.IsCompleted))
                .ForMember(dest => dest.AbandonmentReason, opt => opt.MapFrom(src => src.AbandonmentReason))
                .ForMember(dest => dest.AbandonedAt, opt => opt.MapFrom(src => src.AbandonedAt))
                .ForMember(dest => dest.HasInstantFeedback, opt=> opt.MapFrom(src => src.Quiz.ShowFeedbackImmediately))
                .ForMember(dest => dest.QuizDescription, opt=> opt.MapFrom(src => src.Quiz.Description))
                .ForMember(dest => dest.Category, opt=> opt.MapFrom(src => src.Quiz.Category.Name))
                .ForMember(dest => dest.TotalQuestions, opt => opt.MapFrom(src => src.Quiz.QuizQuestions.Count));*/


            // --- UserAnswer Mappings ---

            CreateMap<UserAnswerCM, UserAnswer>();

            CreateMap<UserAnswer, UserAnswerDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
                .ForMember(dest => dest.QuestionText, opt => opt.MapFrom(src => src.QuizQuestion.Question.Text))

                    .ForMember(dest => dest.QuestionType, opt => opt.MapFrom(src => src.QuizQuestion.Question.Type))
                    .ForMember(dest => dest.TimeLimitInSeconds, opt => opt.MapFrom(src => src.QuizQuestion.TimeLimitInSeconds))
                    .ForMember(dest => dest.TimeSpentInSeconds, opt => opt.MapFrom(src =>
                        src.SubmittedTime.HasValue
                            ? (double?)(src.SubmittedTime.Value - src.QuestionStartTime).TotalSeconds
                            : null))
                    .ForMember(dest => dest.AnswerOptions, opt => opt.MapFrom(src =>
                        (src.QuizQuestion.Question as MultipleChoiceQuestion).AnswerOptions))
                    .ForMember(dest => dest.CorrectAnswerBoolean, opt => opt.MapFrom(src =>
                        (src.QuizQuestion.Question as TrueFalseQuestion).CorrectAnswer))
                    .ForMember(dest => dest.CorrectAnswerText, opt => opt.MapFrom(src =>
                        (src.QuizQuestion.Question as TypeTheAnswerQuestion).CorrectAnswer))
                    .ForMember(dest => dest.AcceptableAnswers, opt => opt.MapFrom(src =>
                        (src.QuizQuestion.Question as TypeTheAnswerQuestion).AcceptableAnswers));

            /*OLD USER ANSWER MAPPING*/
           /* CreateMap<UserAnswer, UserAnswerDto>()
    .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
    .ForMember(dest => dest.QuestionText, opt => opt.MapFrom(src => src.QuizQuestion.Question.Text))
    .ForMember(dest => dest.SelectedOptionText, opt => opt.MapFrom(src => src.AnswerOption != null ? src.AnswerOption.Text : null));
*/
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
                          return context.Mapper.Map<List<AnswerOptionForQuizPlaying>>(mcq.AnswerOptions);
                      }

                      // Check if the question is a TrueFalseQuestion
                      if (src.Question is TrueFalseQuestion tfq)
                      {
                          // True/False questions don't have AnswerOption entities, so we create them on the fly.
                          // We need a way to link back to the correct answer. Let's assume you have a property
                          // `IsCorrectAnswerTrue` on the TrueFalseQuestion entity.
                          // NOTE: You'll need to create AnswerOptionDto with appropriate IDs. For T/F, the concept
                          // of an AnswerOption ID is tricky. We can use a convention like 1 for True, 0 for False.
                          return new List<AnswerOptionForQuizPlaying>
                          {
                            new() { ID = 1, Text = "True" },
                            new() { ID = 0, Text = "False"}
                          };
                      }

                      // For other question types like TypeTheAnswerQuestion, return an empty list.
                      return new List<AnswerOptionForQuizPlaying>();
                  }));
        }

    }
}
