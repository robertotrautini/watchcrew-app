// Screenshot via scripts/maestro-shot-server.py (adb screencap). Used for
// poster-heavy screens where Maestro's takeScreenshot exceeds the 4 MB gRPC
// limit. NAME comes from the runFlow env.
var res = http.get('http://127.0.0.1:8765/shot?name=' + NAME);
if (!res.ok) {
  throw new Error('shot server failed: ' + res.status + ' ' + res.body);
}
