import net from 'net';

/**
 * Check if a port is available
 * @param port Port number to check
 * @returns Promise<boolean> true if available, false otherwise
 */
export function check(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:9',message:'Port check START',data:{port,host:'0.0.0.0'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const srv = net.createServer()
      .once('error', (err) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:11',message:'Port check ERROR',data:{port,available:false,error:err.message,code:(err as any).code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        resolve(false);
      })
      .once('listening', () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:12',message:'Port check SUCCESS',data:{port,available:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        srv.close(() => resolve(true));
      })
      .listen(port, '0.0.0.0');
  });
}

/**
 * Find an available port starting from a preferred port
 * @param preferred Preferred port number (default: 3001)
 * @param maxTries Maximum number of ports to try (default: 10)
 * @returns Promise<number> Available port number
 * @throws Error if no free port is found
 */
export async function getAvailablePort(preferred = 3001, maxTries = 10): Promise<number> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:24',message:'getAvailablePort START',data:{preferred,maxTries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  let p = preferred;
  for (let i = 0; i < maxTries; i++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await check(p);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:29',message:'Port check iteration',data:{preferred,attempt:i+1,testedPort:p,available:ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (ok) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:30',message:'getAvailablePort FOUND',data:{preferred,foundPort:p,attempts:i+1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return p;
    }
    p += 1;
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port.ts:32',message:'getAvailablePort FAILED',data:{preferred,maxTries,lastTestedPort:p-1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  throw new Error(`No free port found starting from ${preferred} (tried ${maxTries} ports)`);
}
