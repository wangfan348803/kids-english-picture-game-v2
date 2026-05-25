function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : fallback
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, error: 'D1 database binding is not configured.' }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400)
  }

  const playerId = cleanText(body.playerId, 80)
  const sessionId = cleanText(body.sessionId, 80)
  const targetWord = cleanText(body.targetWord, 80).toLowerCase()
  const selectedWord = cleanText(body.selectedWord, 80).toLowerCase()
  const targetMeaning = cleanText(body.targetMeaning, 80)
  const selectedMeaning = cleanText(body.selectedMeaning, 80)
  const category = cleanText(body.category, 40)
  const isCorrect = Boolean(body.isCorrect)
  const score = Math.max(0, toNumber(body.score))
  const streak = Math.max(0, toNumber(body.streak))
  const points = toNumber(body.points)
  const responseMs = Math.max(0, toNumber(body.responseMs))
  const now = new Date().toISOString()
  const eventId = crypto.randomUUID()

  if (!playerId || !sessionId || !targetWord || !selectedWord || !targetMeaning || !selectedMeaning || !category) {
    return json({ ok: false, error: 'Missing required answer fields.' }, 400)
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO players (id, created_at, last_seen_at)
       VALUES (?1, ?2, ?2)
       ON CONFLICT(id) DO UPDATE SET last_seen_at = ?2`,
    ).bind(playerId, now),
    env.DB.prepare(
      `INSERT INTO game_sessions (id, player_id, score, best_streak, total_questions, correct_questions, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?6)
       ON CONFLICT(id) DO UPDATE SET
         score = max(score, ?3),
         best_streak = max(best_streak, ?4),
         total_questions = total_questions + 1,
         correct_questions = correct_questions + ?5,
         updated_at = ?6`,
    ).bind(sessionId, playerId, score, streak, isCorrect ? 1 : 0, now),
    env.DB.prepare(
      `INSERT INTO word_progress (
         player_id, word, meaning, category, correct_count, wrong_count, last_result, last_seen_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT(player_id, word) DO UPDATE SET
         meaning = excluded.meaning,
         category = excluded.category,
         correct_count = correct_count + ?5,
         wrong_count = wrong_count + ?6,
         last_result = ?7,
         last_seen_at = ?8`,
    ).bind(playerId, targetWord, targetMeaning, category, isCorrect ? 1 : 0, isCorrect ? 0 : 1, isCorrect ? 1 : 0, now),
    env.DB.prepare(
      `INSERT INTO answer_events (
         id, player_id, session_id, target_word, selected_word, target_meaning, selected_meaning,
         category, is_correct, score, streak, points, response_ms, created_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
    ).bind(
      eventId,
      playerId,
      sessionId,
      targetWord,
      selectedWord,
      targetMeaning,
      selectedMeaning,
      category,
      isCorrect ? 1 : 0,
      score,
      streak,
      points,
      responseMs,
      now,
    ),
  ])

  return json({ ok: true, eventId })
}
