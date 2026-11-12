"""Read-only tunnel route audit. Never serialize tokens, command lines or private paths."""
import base64
import datetime
import json
from pathlib import Path
import platform
import re
import shlex
import subprocess
import urllib.error
import urllib.parse
import urllib.request

OUTPUT = Path(__file__).resolve().parent.parent / 'host-tunnel-boundary.json'
HOSTS = {'story.knolquiz.com', 'story-next.knolquiz.com'}
PIDS = (842, 1102)


def flag(args, name):
    for index, value in enumerate(args):
        if value == name and index + 1 < len(args):
            return args[index + 1]
        if value.startswith(name + '='):
            return value.split('=', 1)[1]
    return None


def oauth_token():
    for relative in ('.wrangler/config/default.toml',
                     'Library/Preferences/.wrangler/config/default.toml',
                     '.config/.wrangler/config/default.toml'):
        path = Path.home() / relative
        if path.is_file():
            match = re.search(r'^oauth_token\s*=\s*("(?:\\.|[^"\\])*")\s*$',
                              path.read_text(), re.M)
            if match:
                return json.loads(match.group(1))
    return None


def scope_metadata():
    path = Path(__file__).resolve().parents[5] / '.cache/rate-trust-cloudflare-session-check.log'
    if not path.is_file():
        return None
    scopes = sorted({name + ':' + access for name, access in
                     re.findall(r'\b([a-z][a-z0-9_:-]*)\s+\((read|write)\)', path.read_text())})
    return {'reportedScopes': scopes,
            'tunnelNamedScopeReported': any('tunnel' in name for name in scopes),
            'boundary': 'Scope names only from existing authenticated whoami output; no email/account ID/raw auth output published. This does not explain the endpoint401 by itself.'}


def safe_service(value):
    if not isinstance(value, str):
        return {'kind': 'missing', 'expectedProductionPort': False}
    if value.startswith('unix:'):
        return {'kind': 'unix', 'expectedProductionPort': False}
    try:
        url = urllib.parse.urlsplit(value)
        if url.scheme in ('http', 'https') and url.hostname in ('localhost', '127.0.0.1', '::1') and not url.username and not url.password:
            host = '[' + url.hostname + ']' if ':' in url.hostname else url.hostname
            service = url.scheme + '://' + host + (':' + str(url.port) if url.port else '')
            return {'kind': 'loopback-http', 'service': service,
                    'servicePathOrQueryPresent': bool(url.path not in ('', '/') or url.query or url.fragment),
                    'expectedProductionPort': url.port == 15501}
    except ValueError:
        pass
    return {'kind': 'other', 'expectedProductionPort': False}


def summarize(config):
    rules = config.get('ingress', [])
    matches = [row for row in rules if row.get('hostname') in HOSTS]
    return {
        'totalRules': len(rules),
        'otherNamedHostRuleCount': sum(bool(row.get('hostname')) and row.get('hostname') not in HOSTS for row in rules),
        'storyRoutes': [dict(hostname=row['hostname'], pathRulePresent='path' in row,
                             originRequestKeys=sorted(row.get('originRequest', {})),
                             **safe_service(row.get('service'))) for row in matches],
        'globalOriginRequestKeys': sorted(config.get('originRequest', {})),
    }


def remote_configuration(token, oauth):
    identity = json.loads(base64.urlsafe_b64decode(token + '=' * (-len(token) % 4)))
    account, tunnel = identity.get('a', ''), identity.get('t', '')
    if not re.fullmatch(r'[a-fA-F0-9]{32}', account) or not re.fullmatch(r'[a-fA-F0-9-]{36}', tunnel):
        raise ValueError('Invalid private tunnel identity metadata.')
    url = 'https://api.cloudflare.com/client/v4/accounts/' + account + '/cfd_tunnel/' + tunnel + '/configurations'
    request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + oauth}, method='GET')
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status, data = response.status, json.load(response)
    except urllib.error.HTTPError as error:
        status, data = error.code, json.loads(error.read())
    report = {'httpStatus': status, 'success': data.get('success', False)}
    if report['success']:
        report.update(summarize(data['result'].get('config', {})))
    else:
        report['errorCodes'] = [row.get('code') for row in data.get('errors', [])]
    return report


def log_configuration(pid):
    """Inspect only process stdout/stderr, in memory, and publish route summaries."""
    found = subprocess.run(['lsof', '-p', str(pid), '-a', '-d', '1,2', '-Fn'],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    paths = {line[1:] for line in found.stdout.splitlines() if line.startswith('n/')}
    candidates = []
    for value in paths:
        path = Path(value)
        if not path.is_file():
            continue
        with path.open('rb') as handle:
            handle.seek(max(0, path.stat().st_size - 8 * 1024 * 1024))
            content = handle.read().decode('utf8', errors='replace')
        for line in content.splitlines():
            match = re.search(r'config=("(?:\\.|[^"\\])*")', line)
            try:
                if match:
                    config = json.loads(json.loads(match.group(1)))
                elif 'config=' in line:
                    config, _ = json.JSONDecoder().raw_decode(line.split('config=', 1)[1])
                else:
                    continue
                if isinstance(config, dict) and 'ingress' in config:
                    candidates.append(config)
            except (ValueError, TypeError):
                continue
    if not candidates:
        return {'available': False, 'boundedLogFilesInspected': len(paths)}
    # Log messages are historical; they cannot prove the currently active remote revision.
    return {'available': True, 'boundedLogFilesInspected': len(paths),
            'historicalOnly': True, **summarize(candidates[-1])}


def main():
    oauth = oauth_token()
    rows = []
    for pid in PIDS:
        row = {'pid': pid}
        try:
            row['uid'] = int(subprocess.check_output(['ps', '-p', str(pid), '-o', 'uid='], text=True).strip())
            args = shlex.split(subprocess.check_output(['ps', '-p', str(pid), '-o', 'args='], text=True))
            token, token_file = flag(args, '--token'), flag(args, '--token-file')
            row.update(tokenOnCommandLine=token is not None, tokenFileConfigured=token_file is not None,
                       configFileConfigured=flag(args, '--config') is not None)
            if token is None and token_file:
                token = Path(token_file).read_text().strip()
            row['remote'] = remote_configuration(token, oauth) if token and oauth else {'success': False, 'existingOAuthAvailable': bool(oauth)}
            if not row['remote'].get('success'):
                row['boundedProcessLogs'] = log_configuration(pid)
        except Exception as error:
            row['failureType'] = type(error).__name__
        rows.append(row)
    containers = {}
    for role in ('api', 'ingress'):
        name = 'knolstory-next-production-' + role + '-1'
        try:
            user = json.loads(subprocess.check_output(['docker', 'inspect', '--format', '{{json .Config.User}}', name], text=True))
            ports = json.loads(subprocess.check_output(['docker', 'inspect', '--format', '{{json .HostConfig.PortBindings}}', name], text=True))
            containers[role] = {'configuredUser': user, 'hostPortBindingCount': len(ports or {}),
                                'hasPublishedHostPorts': bool(ports)}
        except Exception as error:
            containers[role] = {'failureType': type(error).__name__}
    report = {
        'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scope': 'GET-only remote tunnel configuration and bounded read-only process metadata/log summaries.',
        'externalWrites': False,
        'productionProcessesOrConfigurationChanged': False,
        'credentialValuesOrPathsPublished': False,
        'processes': rows,
        'hostPlatform': platform.system(),
        'containers': containers,
        'existingOAuthScopeMetadata': scope_metadata(),
        'limits': ['No Tunnel/header provenance, UID bridge or cloudflared process authentication is proven by route metadata.',
                   'The native Mac cloudflared process is outside the Docker VM. A shared Docker named-volume Unix socket test does not prove host-to-VM socket reachability.',
                   'Log-derived route summaries are historical observations, not proof of the active remote revision.',
                   'Other hostnames are counted only; unrelated routes, account/tunnel IDs and credential material are omitted.'],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
