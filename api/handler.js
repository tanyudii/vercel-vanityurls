function buildHTML(path, repo, repoParsed) {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    `<title>${path}</title>`,
    `<meta name="go-import" content="${path} git ${repo}">`,
    `<meta name="go-source" content="${path} _ ${repoParsed}{/dir} ${repoParsed}{/dir}/{file}#L{line}">`,
    '</head>',
    '<body>',
    path,
    '</body>',
    '</html>'
  ].join('');
}

function getPackageName(url) {
  return url.includes('?')
    ? url.slice(1, url.indexOf('?')).trim()
    : url.slice(1).trim();
}

module.exports = (req, res) => {
  if (req.url && req.url.toLowerCase() === '/favicon.ico') {
    res.statusCode = 204;
    return res.end();
  }

  const gitAccount = process.env.VANITYURLS_GIT_ACCOUNT;
  if (!gitAccount) {
    return res.status(500).send('Vercel Vanity URLs error: Git account not provided.');
  }

  const pkg = getPackageName(req.url);
  if (!pkg.length) {
    res.writeHead(301, {Location: gitAccount});
    return res.end();
  }

  const paths = pkg.split("/");
  let importRoot = `${req.headers.host}/${pkg}`;
  let repo = `${gitAccount}/${pkg}`;
  let repoParsed = `${gitAccount}/${pkg}`;

  const specialPackages = process.env.VANITYURLS_SPECIAL_PACKAGES !== "" ? process.env.VANITYURLS_SPECIAL_PACKAGES.split(",") : [];
  if (specialPackages.includes(paths[0])) {
    // Repo is always the first path segment (e.g. github.com/embraceid/go-pkg).
    repo = `${gitAccount}/${paths[0]}`
    repoParsed = `${gitAccount}/${paths[0]}`
    // Module root uses up to 2 path segments normally (e.g. go-pkg/common),
    // but extends to 3 when the third segment is a major-version suffix like
    // v2, v3, … so that go-pkg/common/v2 gets the correct go-import name.
    // Deeper paths (go-pkg/common/v2/pointer) still resolve to the 3-segment root.
    let moduleDepth = paths.length >= 2 ? 2 : 1;
    if (paths.length >= 3 && /^v[2-9]\d*$/.test(paths[2])) {
      moduleDepth = 3;
    }
    importRoot = `${req.headers.host}/${paths.slice(0, moduleDepth).join('/')}`
  }

  if (gitAccount.includes("gitlab")) {
    repoParsed += "/-"
  }
  repoParsed += "/tree/master"

  return res.send(buildHTML(importRoot, repo, repoParsed));
};
