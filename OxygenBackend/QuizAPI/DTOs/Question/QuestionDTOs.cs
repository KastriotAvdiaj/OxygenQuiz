﻿using QuizAPI.DTOs.User;
using QuizAPI.Models;
using System.Text.Json.Serialization;

namespace QuizAPI.DTOs.Question
{
    // CM = Create Model, for creating the question

    // This worked for getting specific types of questions in the quiz questions service method.
    [JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
    [JsonDerivedType(typeof(MultipleChoiceQuestionDTO), typeDiscriminator: "MultipleChoice")]
    [JsonDerivedType(typeof(TrueFalseQuestionDTO), typeDiscriminator: "TrueFalse")]
    [JsonDerivedType(typeof(TypeTheAnswerQuestionDTO), typeDiscriminator: "TypeTheAnswer")]
    public class QuestionBaseDTO
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public QuestionDifficultyDTO Difficulty { get; set; }
        public QuestionCategoryDTO Category { get; set; }
        public QuestionLanguageDTO Language { get; set; }
        public UserBasicDTO User { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ImageUrl { get; set; }
        public string Visibility { get; set; }
        public string Type { get; set; }
    }

    public class MultipleChoiceQuestionDTO : QuestionBaseDTO
    {
        public List<AnswerOptionDTO> AnswerOptions { get; set; } = new List<AnswerOptionDTO>();
        public bool AllowMultipleSelections { get; set; }
    }

    public class TrueFalseQuestionDTO : QuestionBaseDTO
    {
        public bool CorrectAnswer { get; set; }
    }

    public class TypeTheAnswerQuestionDTO : QuestionBaseDTO
    {
        public string CorrectAnswer { get; set; } = string.Empty;
        public bool IsCaseSensitive { get; set; }
        public bool AllowPartialMatch { get; set; }
        public List<string> AcceptableAnswers { get; set; } = new List<string>();
    }

    // Creation Models (CMs)
    public class QuestionBaseCM
    {
        public string Text { get; set; } = string.Empty;

        public string? ImageUrl { get; set; }
        public int DifficultyId { get; set; }
        public int CategoryId { get; set; }
        public int LanguageId { get; set; }
        public string Visibility { get; set; } = "Global";
    }

    public class MultipleChoiceQuestionCM : QuestionBaseCM
    {
        public List<AnswerOptionCM> AnswerOptions { get; set; } = new List<AnswerOptionCM>();
        public bool AllowMultipleSelections { get; set; }
    }

    public class TrueFalseQuestionCM : QuestionBaseCM
    {
        public bool CorrectAnswer { get; set; }
    }

    public class TypeTheAnswerQuestionCM : QuestionBaseCM
    {
        public string CorrectAnswer { get; set; } = string.Empty;
        public bool IsCaseSensitive { get; set; }
        public bool AllowPartialMatch { get; set; }
        public List<string> AcceptableAnswers { get; set; } = new List<string>();
    }

    // Update Models (UMs)
    public class QuestionBaseUM
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public int DifficultyId { get; set; }
        public int CategoryId { get; set; }
        public int LanguageId { get; set; }
        public string Visibility { get; set; }
    }

    public class MultipleChoiceQuestionUM : QuestionBaseUM
    {
        public List<AnswerOptionUM> AnswerOptions { get; set; } = new List<AnswerOptionUM>();
        public bool AllowMultipleSelections { get; set; }
    }

    public class TrueFalseQuestionUM : QuestionBaseUM
    {
        public bool CorrectAnswer { get; set; }
    }

    public class TypeTheAnswerQuestionUM : QuestionBaseUM
    {
        public string CorrectAnswer { get; set; } = string.Empty;
        public bool IsCaseSensitive { get; set; }
        public bool AllowPartialMatch { get; set; }
        public List<string> AcceptableAnswers { get; set; } = new List<string>();
    }
   

    public class IndividualQuestionDTO {
    
            public int ID { get; set; }

            public string Text { get; set; } = string.Empty;

            public int DifficultyId { get; set; }
            public string Difficulty { get; set; }

            public int CategoryId { get; set; }

            public string Category { get; set; }

            public int LanguageId { get; set; }

            public string Language { get; set; }

            public string Visibility  { get; set; }

            public Guid UserId { get; set; }

            public DateTime CreatedAt { get; set; }

            public UserBasicDTO User { get; set; }
            public List<AnswerOptionDTO> AnswerOptions { get; set; }

        }


    public class AnswerOptionCM
    {
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }

    public class AnswerOptionUM
    {
        public int? Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }

    public class AnswerOptionDTO
    {
        public int ID { get; set; }
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }

}
