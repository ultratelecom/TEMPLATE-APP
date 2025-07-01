import { runMatrixTest } from './matrixLoginTest';

runMatrixTest().then(() => {
  console.log("✅ Test complete");
}).catch((err) => {
  console.error("❌ Test failed:", err);
}); 