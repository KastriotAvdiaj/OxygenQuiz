using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// Source mode writes questions in the material's own language and accepts only English and
/// Albanian, so this decides both what a quiz is written in and whether one is written at all.
/// The cases that matter most are the near misses: languages that share short words with Albanian
/// (Italian "e", "i", "per", "se"; Serbo-Croatian "i", "u", "se") must still come back as
/// unsupported. Italian passed as Albanian in the first version of the detector.
/// </summary>
public class SourceLanguageDetectorTests
{
    private const string EnglishText =
        "Photosynthesis is the process by which green plants and some other organisms use sunlight " +
        "to synthesize foods from carbon dioxide and water. It takes place mainly in the leaves, " +
        "where the chloroplasts contain chlorophyll, the pigment that absorbs light. The oxygen that " +
        "is released as a by-product is essential for most life on Earth, and the sugars that are " +
        "produced are used by the plant for energy and growth.";

    private const string AlbanianText =
        "Rilindja Kombëtare ishte një periudhë e rëndësishme në historinë e shqiptarëve. Gjatë kësaj " +
        "kohe, shkrimtarët dhe atdhetarët punuan për të ruajtur gjuhën shqipe dhe për të krijuar " +
        "shkolla në gjuhën amtare. Naim Frashëri është një nga poetët më të njohur të kësaj periudhe, " +
        "dhe veprat e tij u lexuan nga shumë njerëz. Ata besonin se arsimi ishte rruga drejt lirisë.";

    // The same kind of prose typed the way phones and quick notes usually are: no ë, no ç.
    private const string AlbanianWithoutDiacritics =
        "Kosova eshte nje vend i vogel ne Ballkan. Kryeqyteti i saj eshte Prishtina, qe eshte edhe " +
        "qyteti me i madh. Ne vitin 2008 Kosova shpalli pavaresine, dhe shume shtete e kane njohur. " +
        "Popullsia e saj eshte e re dhe shume te rinj studiojne ne universitet.";

    private const string GermanText =
        "Die Photosynthese ist ein Prozess, bei dem Pflanzen mit Hilfe von Sonnenlicht aus " +
        "Kohlendioxid und Wasser Zucker herstellen. Sie findet vor allem in den Blättern statt, wo " +
        "die Chloroplasten das grüne Pigment Chlorophyll enthalten. Der dabei freigesetzte Sauerstoff " +
        "ist für das Leben auf der Erde unverzichtbar, und der Zucker dient der Pflanze als Energie.";

    private const string FrenchText =
        "La photosynthèse est le processus par lequel les plantes vertes utilisent la lumière du " +
        "soleil pour produire des sucres à partir du dioxyde de carbone et de l'eau. Elle se déroule " +
        "surtout dans les feuilles, où les chloroplastes contiennent la chlorophylle. L'oxygène " +
        "libéré ne sert pas seulement aux plantes, il est essentiel à la vie sur la Terre.";

    private const string SpanishText =
        "La fotosíntesis es el proceso por el cual las plantas verdes usan la luz del sol para " +
        "producir azúcares a partir del dióxido de carbono y el agua. Se realiza sobre todo en las " +
        "hojas, donde los cloroplastos contienen la clorofila. El oxígeno que se libera es esencial " +
        "para la vida en la Tierra, y me parece que por eso se estudia tanto en la escuela.";

    private const string ItalianText =
        "La fotosintesi è il processo con cui le piante verdi usano la luce del sole per produrre " +
        "zuccheri a partire dall'anidride carbonica e dall'acqua. Avviene soprattutto nelle foglie, " +
        "dove i cloroplasti contengono la clorofilla. L'ossigeno che si libera è essenziale per la " +
        "vita sulla Terra, e per questo se ne parla tanto a scuola.";

    // The likeliest other languages in material from Kosovo and Albania.
    private const string SerboCroatianText =
        "Fotosinteza je proces u kojem biljke koriste sunčevu svjetlost da bi od ugljen-dioksida i " +
        "vode napravile šećer. Ona se odvija uglavnom u listovima, gdje se nalaze hloroplasti koji " +
        "sadrže hlorofil. Kiseonik koji se oslobađa je važan za život na Zemlji, a šećer biljka " +
        "koristi kao izvor energije za rast.";

    private const string TurkishText =
        "Fotosentez, yeşil bitkilerin güneş ışığını kullanarak karbondioksit ve sudan şeker ürettiği " +
        "bir süreçtir. Bu süreç daha çok yapraklarda gerçekleşir ve klorofil bu işte önemli bir rol " +
        "oynar. Açığa çıkan oksijen dünyadaki yaşam için gereklidir.";

    private const string PortugueseText =
        "A fotossíntese é o processo pelo qual as plantas verdes usam a luz do sol para produzir " +
        "açúcares a partir do dióxido de carbono e da água. Ela ocorre principalmente nas folhas, " +
        "onde os cloroplastos contêm a clorofila. O oxigênio que é liberado é essencial para a vida.";

    // Cyrillic: no list scores anything, so there is no winner to accept.
    private const string MacedonianText =
        "Фотосинтезата е процес во кој растенијата ја користат сончевата светлина за да произведат " +
        "шеќер од јаглерод диоксид и вода. Таа се одвива главно во листовите.";

    [Fact]
    public void English_prose_is_English() =>
        Assert.Equal(SourceLanguageDetector.English, SourceLanguageDetector.Detect(EnglishText));

    [Fact]
    public void Albanian_prose_is_Albanian() =>
        Assert.Equal(SourceLanguageDetector.Albanian, SourceLanguageDetector.Detect(AlbanianText));

    [Fact]
    public void Albanian_typed_without_diacritics_is_still_Albanian() =>
        Assert.Equal(SourceLanguageDetector.Albanian, SourceLanguageDetector.Detect(AlbanianWithoutDiacritics));

    [Theory]
    [InlineData(GermanText)]
    [InlineData(FrenchText)]
    [InlineData(SpanishText)]
    [InlineData(ItalianText)]
    [InlineData(SerboCroatianText)]
    [InlineData(TurkishText)]
    [InlineData(PortugueseText)]
    [InlineData(MacedonianText)]
    public void Other_languages_are_unsupported(string text) =>
        Assert.Null(SourceLanguageDetector.Detect(text));

    [Fact]
    public void Material_mostly_in_one_language_with_quotes_in_the_other_follows_the_majority()
    {
        // An English article that quotes an Albanian line: the questions should be English.
        var text = EnglishText + " " + EnglishText + " As the poet wrote: \"Ti Shqipëri më jep nder.\"";

        Assert.Equal(SourceLanguageDetector.English, SourceLanguageDetector.Detect(text));
    }

    [Fact]
    public void An_even_mix_is_not_guessed_at() =>
        Assert.Null(SourceLanguageDetector.Detect(EnglishText + " " + AlbanianText));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("12345 67890 !!!")]
    [InlineData("Photosynthesis")]
    public void Nothing_to_go_on_is_unsupported(string? text) =>
        Assert.Null(SourceLanguageDetector.Detect(text));

    [Fact]
    public void Case_does_not_matter() =>
        Assert.Equal(SourceLanguageDetector.English, SourceLanguageDetector.Detect(EnglishText.ToUpperInvariant()));
}
