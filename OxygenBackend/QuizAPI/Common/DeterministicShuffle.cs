namespace QuizAPI.Common
{
    /// <summary>
    /// Reorders a collection into a shuffle that is <b>random-looking but reproducible</b>: the same
    /// seed and the same items always produce the same order, on any machine, in any process, after
    /// any restart.
    ///
    /// <para><b>Why not just shuffle.</b> The live-play DTO is rebuilt on every state poll, every
    /// resume and every reconnect. A plain <c>Random</c> would hand the player a different option
    /// order each time the page refreshed — answers appearing to move under the cursor mid-question,
    /// which is worse than the bias it set out to fix. Seeding by session and question makes the
    /// order a pure function of "who is playing which question", so it is computed fresh each call
    /// and comes out identical every time. Nothing has to be stored.</para>
    ///
    /// <para><b>Why not <c>string.GetHashCode()</c>.</b> It is randomised per process in .NET Core.
    /// Seeding from it would look correct in every test and then reorder every in-flight question
    /// the moment the API restarted — the kind of bug that only appears in production, during a
    /// deploy, to whoever was mid-quiz. FNV-1a is fixed by its specification.</para>
    ///
    /// <para><b>Why not <c>new Random(seed)</c> either.</b> Seeded <c>Random</c> is deterministic
    /// within a runtime, but the algorithm behind it is not a documented cross-version contract.
    /// Ordering by a hash of (seed, id) has no such dependency, and has the nicer property of being
    /// independent of the input order — so it cannot accidentally preserve an already-biased
    /// arrangement.</para>
    ///
    /// <para>This is deliberately not cryptographic. A player who predicted the permutation would
    /// learn the order of the options, not which one is correct.</para>
    /// </summary>
    public static class DeterministicShuffle
    {
        /// <param name="seed">
        /// What the order is a function of. For single-player, session id + quiz-question id — the
        /// same player replaying gets a new order because the session is new. For a multiplayer
        /// match, one freshly generated value per match, so every player in it sees the same board
        /// and the next match differs.
        /// </param>
        /// <param name="key">
        /// A stable per-item identity — a database id. Not the index: seeding off a position would
        /// make the result depend on the order that came in, which is the thing being replaced.
        /// </param>
        public static List<T> By<T>(IEnumerable<T> items, string seed, Func<T, int> key)
        {
            ArgumentNullException.ThrowIfNull(items);
            ArgumentNullException.ThrowIfNull(key);

            // ThenBy(key) makes the order total: two items can only tie if they share an id, which
            // ids do not, but leaving the tiebreak implicit would make that an assumption rather
            // than a guarantee.
            return items
                .OrderBy(item => Mix(seed, key(item)))
                .ThenBy(key)
                .ToList();
        }

        private const ulong FnvOffsetBasis = 14695981039346656037UL;
        private const ulong FnvPrime = 1099511628211UL;

        /// <summary>FNV-1a over the seed's UTF-16 bytes and the key's four bytes.</summary>
        private static ulong Mix(string seed, int key)
        {
            var hash = FnvOffsetBasis;

            foreach (var c in seed)
            {
                hash = (hash ^ (byte)c) * FnvPrime;
                hash = (hash ^ (byte)(c >> 8)) * FnvPrime;
            }

            // A separator, so ("ab", 1) and ("a", 0x6231…) cannot collide by concatenation.
            hash = (hash ^ (byte)'#') * FnvPrime;

            var bits = unchecked((uint)key);
            for (var i = 0; i < 4; i++)
                hash = (hash ^ (byte)(bits >> (i * 8))) * FnvPrime;

            return hash;
        }
    }
}
