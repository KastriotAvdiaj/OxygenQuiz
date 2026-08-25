namespace QuizAPI.DTOs.Question
{

    //CM = Create Model
    public class QuestionCategoryCM
    {
        public string Name { get; set; }
        public List<string>? ColorPalette { get; set; } 
        public bool Gradient { get; set; } = false;    
    }

    /// <summary>
    /// A category as anyone may see it. This type is embedded in question and quiz payloads
    /// (<see cref="QuestionDTOs"/>, <c>QuizDTO</c>), several of which are readable
    /// anonymously — so anything added here is public by default.
    ///
    /// <para><b>No <c>Username</c>.</b> Who created a lookup row is admin metadata and has no
    /// business in a public response; it used to ride along on every category in every
    /// question and quiz payload. The admin dashboard still needs it, so it lives on
    /// <see cref="QuestionCategoryAdminDTO"/> and is served only from the role-gated search
    /// endpoint. Do not add it back here.</para>
    /// </summary>
    public class QuestionCategoryDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? ColorPaletteJson { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool Gradient { get; set; }
    }

    /// <summary>
    /// The category as the admin dashboard sees it: everything public plus who created it.
    /// Served only from role-gated endpoints.
    /// </summary>
    public class QuestionCategoryAdminDTO : QuestionCategoryDTO
    {
        public string? Username { get; set; }
    }

}
