import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'אינך מחובר' }, { status: 401 });
    }

    // קבלת GitHub access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    // יצירת repository
    const repoName = 'building-management-system';
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        description: 'מערכת ניהול בנייין - Building Management System',
        private: false,
        auto_init: true
      })
    });

    if (!createRepoRes.ok) {
      const errorData = await createRepoRes.json();
      // אם ה-repo כבר קיים, המשך
      if (errorData.errors?.[0]?.message?.includes('name already exists')) {
        console.log('Repository already exists, proceeding with update');
      } else {
        throw new Error(`Failed to create repo: ${errorData.message}`);
      }
    }

    const repoData = await createRepoRes.json();
    const repoUrl = repoData.clone_url || `https://github.com/${repoData.owner.login}/${repoName}.git`;
    const htmlUrl = repoData.html_url || `https://github.com/${repoData.owner?.login || user.login}/${repoName}`;

    return Response.json({
      success: true,
      message: 'Repository נוצר בהצלחה!',
      repoUrl,
      htmlUrl,
      repoName
    });
  } catch (error) {
    console.error('GitHub error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});