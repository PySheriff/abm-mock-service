import { journey, step, request } from '@elastic/synthetics';

journey('ABM Server Validation', ({ page }) => {
step('Fetch and validate ABM servers', async () => {
  const context = await request.newContext();
  const baseUrl = 'https://pysheriff.github.io/abm-mock-service';

  // Fetch frontend URLs
  const frontendResp = await context.get(`${baseUrl}/prbg/api/active-ips/tst/paris3-frontend.json`);
  const frontendData = await frontendResp.json();
  const frontendURLs = frontendData.map(item => item.ip_address);

  // Fetch backend URLs
  const backendResp = await context.get(`${baseUrl}/prbg/api/active-ips/tst/paris3-backend.json`);
  const backendData = await backendResp.json();
  const backendURLs = backendData.map(item => item.ip_address);

  const allURLs = [...frontendURLs, ...backendURLs];
  console.log(`Validating ${allURLs.length} ABM servers...`);

  let failures = [];

  const batchSize = 10;
  for (let i = 0; i < allURLs.length; i += batchSize) {
    const batch = allURLs.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const resp = await context.get(url, { timeout: 5000 });
          const body = await resp.text();
          if (resp.status() === 200 && body.includes('Calc')) {
            console.log(`SUCCESS: ${url}`);
          } else {
            throw new Error(`Missing 'Calc' or non-200 status (${resp.status()})`);
          }
        } catch (err) {
          console.error(`FAILURE: ${url} - ${err.message}`);
          failures.push(url);
        }
      })
    );
  }

  await context.dispose();

  if (failures.length > 0) {
    throw new Error(`${failures.length} ABM server(s) failed: ${failures.join(', ')}`);
  }

  console.log(`All ${allURLs.length} ABM servers validated successfully`);
});
});
