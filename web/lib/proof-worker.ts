export interface ProofRequest {
  circuit: "enroll" | "signal" | "vote";
  witness: Record<string, unknown>;
}

export interface ProofResponse {
  proof: Uint8Array;
  publicInputs: Record<string, unknown>;
}

// Placeholder for browser worker integration. Noir WASM should be loaded in a dedicated worker thread
// to keep UI responsive during proof generation.
export async function generateProof(_request: ProofRequest): Promise<ProofResponse> {
  throw new Error("Proof worker not wired yet. Load Barretenberg WASM and call nargo generated functions.");
}
