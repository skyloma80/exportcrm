/**
 * Test PDF API to debug cost_breakdown issue
 */

const quotationId = 'psxegp2i7znjrl1';
const apiUrl = `http://localhost:3000/api/quotations/${quotationId}/pdf`;

console.log('Testing PDF API...');
console.log('URL:', apiUrl);

try {
  const response = await fetch(apiUrl);
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log('PDF size:', buffer.byteLength, 'bytes');
    console.log('✓ PDF generated successfully');
  } else {
    const error = await response.text();
    console.error('Error:', error);
  }
} catch (error) {
  console.error('Failed to call API:', error.message);
}
