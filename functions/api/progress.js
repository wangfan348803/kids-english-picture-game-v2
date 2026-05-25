function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, error: 'D1 database binding is not configured.' }, 503)
  }

  const url = new URL(request.url)
  const playerId = (url.searchParams.get('playerId') || '').trim().slice(0, 80)
  if (!playerId) {
    return json({ ok: false, error: 'Missing playerId.' }, 400)
  }

  const summary = await env.DB.prepare(
    `SELECT
       COUNT(*) AS seen_words,
       COALESCE(SUM(correct_count), 0) AS correct_count,
       COALESCE(SUM(wrong_count), 0) AS wrong_count
     FROM word_progress
     WHERE player_id = ?1`,
  )
    .bind(playerId)
    .first()

  const difficultWords = await env.DB.prepare(
    `SELECT word, meaning, category, correct_count, wrong_count, last_result, last_seen_at
     FROM word_progress
     WHERE player_id = ?1 AND wrong_count > 0
     ORDER BY wrong_count DESC, last_seen_at DESC
     LIMIT 5`,
  )
    .bind(playerId)
    .all()

  return json({
    ok: true,
    summary,
    difficultWords: difficultWords.results || [],
  })
}
