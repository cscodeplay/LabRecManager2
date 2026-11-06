const { spawn } = require('child_process');

/**
 * Execute Python code under a sys.settrace sandbox to record line-by-line variable states and watch expressions.
 * @param {Object} options
 * @param {string} options.code - Python code to trace
 * @param {string} [options.stdin] - Standard input string
 * @param {string[]} [options.watchExpressions] - List of expressions to evaluate at each step
 * @param {number} [options.maxSteps=250] - Maximum execution steps to record
 * @param {number} [options.timeoutMs=3500] - Hard execution timeout
 * @returns {Promise<{ success: boolean, steps: Array, error?: string, line?: number, output?: string }>}
 */
function tracePythonExecution({
    code,
    stdin = '',
    watchExpressions = [],
    maxSteps = 250,
    timeoutMs = 3500
}) {
    return new Promise((resolve) => {
        if (!code || !code.trim()) {
            return resolve({ success: true, steps: [], output: '' });
        }

        const validWatches = (Array.isArray(watchExpressions) ? watchExpressions : [])
            .map(w => typeof w === 'string' ? w.trim() : (w?.expr || '').trim())
            .filter(Boolean);

        const tracerScript = `
import sys, json, io

code_str = ${JSON.stringify(code)}
watch_exprs = ${JSON.stringify(validWatches)}
MAX_STEPS = ${Math.min(maxSteps, 500)}

steps = []
prev_vars = {}
captured_out = io.StringIO()
orig_stdout = sys.stdout

def tracer(frame, event, arg):
    if len(steps) >= MAX_STEPS:
        return None
    if event == "line":
        if frame.f_code.co_filename == "<user_code>":
            lineno = frame.f_lineno
            locs = {}
            scope = {}
            # Scope from globals and locals
            for k, v in frame.f_globals.items():
                if not k.startswith("__") and not callable(v) and not hasattr(v, "__file__"):
                    scope[k] = v
            for k, v in frame.f_locals.items():
                if not k.startswith("__") and not callable(v):
                    scope[k] = v

            var_list = []
            for k in sorted(scope.keys()):
                v = scope[k]
                val_str = repr(v)
                if len(val_str) > 90:
                    val_str = val_str[:87] + "..."
                changed = (k not in prev_vars or prev_vars[k] != val_str)
                var_list.append({
                    "name": k,
                    "value": val_str,
                    "type": type(v).__name__,
                    "changed": changed
                })
                prev_vars[k] = val_str

            watches = {}
            for expr in watch_exprs:
                try:
                    w_val = eval(expr, frame.f_globals, frame.f_locals)
                    watches[expr] = repr(w_val)
                except Exception:
                    watches[expr] = "<undefined>"

            steps.append({
                "lineNumber": lineno,
                "functionName": frame.f_code.co_name,
                "variables": var_list,
                "watches": watches,
                "stdout": captured_out.getvalue()
            })
    return tracer

try:
    compiled = compile(code_str, "<user_code>", "exec")
    sys.stdout = captured_out
    sys.settrace(tracer)
    try:
        exec(compiled, {"__name__": "__main__"})
    except Exception as run_err:
        steps.append({
            "lineNumber": getattr(run_err, "lineno", steps[-1]["lineNumber"] if steps else 1),
            "functionName": "error",
            "variables": [
                {"name": k, "value": v, "type": "str", "changed": False}
                for k, v in prev_vars.items()
            ],
            "watches": {w: "<error>" for w in watch_exprs},
            "error": str(run_err)
        })
    finally:
        sys.settrace(None)
        sys.stdout = orig_stdout
    print(json.dumps({"success": True, "steps": steps, "output": captured_out.getvalue()}))
except SyntaxError as se:
    sys.stdout = orig_stdout
    print(json.dumps({"success": False, "error": f"SyntaxError: {se.msg}", "line": se.lineno, "steps": []}))
except Exception as e:
    sys.stdout = orig_stdout
    print(json.dumps({"success": False, "error": str(e), "steps": []}))
`;

        const child = spawn('python3', ['-c', tracerScript]);
        let stdout = '';
        let stderr = '';
        let isTimedOut = false;

        const timer = setTimeout(() => {
            isTimedOut = true;
            try { child.kill('SIGKILL'); } catch (_) {}
            resolve({
                success: true,
                steps: [],
                error: 'Execution timed out (infinite loop or wait detected)',
                output: stdout
            });
        }, timeoutMs);

        if (stdin) {
            try {
                child.stdin.write(stdin);
                child.stdin.end();
            } catch (_) {}
        } else {
            try { child.stdin.end(); } catch (_) {}
        }

        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        child.on('close', () => {
            clearTimeout(timer);
            if (isTimedOut) return;

            try {
                const parsed = JSON.parse(stdout.trim());
                resolve(parsed);
            } catch (err) {
                resolve({
                    success: false,
                    error: stderr.trim() || err.message,
                    steps: []
                });
            }
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                success: false,
                error: err.message,
                steps: []
            });
        });
    });
}

module.exports = { tracePythonExecution };
