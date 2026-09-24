// Supabase keep-alive endpoint for Vercel.
// Deploy at: /api/keepalive.js
// It performs one tiny READ-only request and never inserts/updates/deletes data.

const PROJECTS = [
  {
    name: 'Vehicle PMS Tracker',
    url: 'https://lvzveqvthndrqdnzkibn.supabase.co',
    key: 'sb_publishable_91IxkckPPrM-hyOJPjO6nQ_Omy29TBK',
    table: 'test_table',
  },
];

async function pingProject(project) {
  const url = `${project.url}/rest/v1/${encodeURIComponent(project.table)}?select=*&limit=1`;

  try {
    const result = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: project.key,
        Authorization: `Bearer ${project.key}`,
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
      },
      cache: 'no-store',
    });

    const body = await result.text();
    return {
      name: project.name,
      ok: result.ok,
      status: result.status,
      table: project.table,
      error: result.ok ? null : body.slice(0, 300),
    };
  } catch (error) {
    return {
      name: project.name,
      ok: false,
      status: 0,
      table: project.table,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const results = await Promise.all(PROJECTS.map(pingProject));
    const failed = results.filter(item => !item.ok);

    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (failed.length > 0) {
      return response.status(502).json({
        ok: false,
        message: `${failed.length} of ${results.length} Supabase keep-alive checks failed.`,
        results,
        checkedAt: new Date().toISOString(),
      });
    }

    return response.status(200).json({
      ok: true,
      message: `All ${results.length} Supabase projects were pinged successfully.`,
      results,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    });
  }
}
