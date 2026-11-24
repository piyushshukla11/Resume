export type ProjectCategory = "systems" | "ai" | "games";

export type PortfolioProject = {
  id: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  tags: string[];
  summary: string;
  architecture: string[];
  outcomes: string[];
  githubUrl: string;
  demoUrl?: string;
  featured: boolean;
  problemStatement?: string;
  technicalDeepDive?: string[];
  challengesSolved?: string[];
  metrics?: { label: string; value: string }[];
  codeHighlight?: { language: string; filename: string; snippet: string };
};

export const featuredProjects: PortfolioProject[] = [
  {
    id: "polyexecution-studio2",
    title: "PolyExecution Studio 2 (PES 2)",
    subtitle: "Zero-trust kernel sandbox supporting 27 LeetCode runtime environments",
    category: "systems",
    tags: ["C", "Linux cgroups v2", "Namespaces", "seccomp-bpf", "Python", "gRPC", "27 Runtimes"],
    summary: "A high-performance remote execution engine and browser studio engineered to safely evaluate 27 programming environments. Built with Linux cgroups v2, unprivileged user/mount/pid/net namespaces, strict seccomp-bpf filters, and typed runtime adapters.",
    problemStatement: "Running untrusted student or competitive code in modern web platforms traditionally relies on heavy Docker containers, adding hundreds of milliseconds of startup overhead per execution and consuming gigabytes of daemon RAM while struggling to safely support diverse language families (JVM, .NET, BEAM VM, databases).",
    technicalDeepDive: [
      "Custom Linux native runner written in C leveraging clone(), unshare(CLONE_NEWPID | CLONE_NEWNET | CLONE_NEWNS), and pivot_root for sub-millisecond container creation.",
      "Strict resource bounding with setrlimit() for CPU time, file size, stack depth, and RLIMIT_NOFILE to prevent fork bombs and file descriptor leaks.",
      "Seccomp-BPF least-privilege filter profiles tailored per language, permitting sched_setaffinity(pid == 0) for runtimes like CoreCLR while default-denying socket() and elevated syscalls.",
      "Control plane decoupled from the native worker via gRPC streams, handling lifecycle milestones from accepted, compiling, to running and result collection across 27 LeetCode environments.",
    ],
    challengesSolved: [
      "Eliminated container daemon latency, dropping process isolation startup from ~450ms (Docker) to <12ms native execution.",
      "Engineered typed RuntimeAdapter abstractions for 27 LeetCode environments ranging from GCC/Clang and JVM to BEAM VM and disposable PostgreSQL.",
      "Prevented CoreCLR .NET 10 startup out-of-memory errors by tuning virtual memory limits and file size allowances for memfd JIT compilation buffers.",
      "Enforced zero cgroup leftovers through rigorous delegated cgroup v2 subtree cleanup on process completion.",
    ],
    metrics: [
      { label: "Worker Startup", value: "<12ms" },
      { label: "Environments", value: "27 LeetCode Runtimes" },
      { label: "Syscall Filtering", value: "Seccomp BPF" },
      { label: "Sandbox Security", value: "Net/PID/Mnt Namespaces" },
    ],
    codeHighlight: {
      language: "c",
      filename: "sandbox/src/runner.c",
      snippet: `// Native Linux process isolation with seccomp BPF and namespace boundaries
int enter_sandbox_containment(const sandbox_config_t *cfg) {
    if (unshare(CLONE_NEWPID | CLONE_NEWNET | CLONE_NEWNS | CLONE_NEWIPC) != 0) {
        return -errno;
    }
    apply_rlimits(cfg->cpu_sec, cfg->mem_bytes, cfg->max_pids);
    apply_seccomp_bpf_filter(cfg->profile);
    return execve(cfg->binary_path, cfg->argv, cfg->envp);
}`,
    },
    architecture: [
      "Process Bounding Layer: unshare(), pivot_root(), and private tmpfs mounts preventing host breakout.",
      "Seccomp-BPF Filter: Whitelisted syscall tables denying raw network sockets and privilege escalation.",
      "Cgroup v2 Subtrees: Precise hard caps on peak memory and CPU bandwidth with deterministic OOM handling.",
      "Execution Control Plane: gRPC streaming worker architecture supporting concurrent isolation rings across 27 language environments.",
    ],
    outcomes: [
      "Sub-millisecond process startup overhead compared to heavyweight OCI containers.",
      "Safe multi-tenant untrusted execution runtime supporting 27 LeetCode programming languages for competitive platforms and coding education.",
    ],
    githubUrl: "https://github.com/piyushshukla11/polyexecution-studio2",
    featured: true,
  },
  {
    id: "polyexecution-studio",
    title: "PolyExecution Studio (PES 1)",
    subtitle: "Collaborative browser code studio & low-latency C sandbox runner",
    category: "systems",
    tags: ["C", "Linux namespaces", "cgroups v2", "Kotlin", "gRPC", "Java 21"],
    summary: "A collaborative multi-language execution platform featuring a C sandbox runner with pivot_root and seccomp-bpf isolation, backed by an asynchronous Kotlin gRPC worker using Java 21 virtual threads.",
    problemStatement: "Building collaborative coding platforms requires immediate runtime feedback without exposing the host OS to malicious code, arbitrary execution escapes, fork bombs, or high daemon latency from heavyweight Docker engines.",
    technicalDeepDive: [
      "Low-level C sandbox runner implementing process lifecycle controls (fork, execve, wait4), RLIMIT resource enforcement, non-blocking pipe draining via poll(), and fail-closed isolation.",
      "Linux security hardening using cgroups v2 (pids.max, memory, cpu.weight), Linux namespaces (User, Mount, PID, Network), pivot_root with private tmpfs rootfs, capability dropping, and seccomp-bpf allowlists.",
      "Kotlin gRPC execution worker implementing an additive progress streaming contract emitting truthful lifecycle events (STAGE_COMPILING, STAGE_RUNNING) over HTTP/2.",
      "High-concurrency I/O utilizing dedicated Java 21 virtual threads for asynchronous process pipe draining, preventing thread pool exhaustion under heavy concurrent user runs.",
    ],
    challengesSolved: [
      "Eliminated container daemon overhead, achieving sub-15ms sandbox process startup.",
      "Engineered fail-closed isolation guarantees that terminate instantly with structured errors if any namespace or cgroup prerequisite fails.",
      "Guaranteed ephemeral workspace lifecycle integrity with recursive cleanup and strict symlink traversal defense.",
    ],
    metrics: [
      { label: "Sandbox Startup", value: "<15ms" },
      { label: "Concurrency", value: "Java 21 Virtual Threads" },
      { label: "Host Protection", value: "Namespaces + Cgroups v2" },
      { label: "Worker IPC", value: "gRPC Streaming" },
    ],
    codeHighlight: {
      language: "c",
      filename: "sandbox-runner/src/main.c",
      snippet: `// Fail-closed C sandbox runner with unshare and pivot_root containment
int setup_isolation_jail(const char *new_root) {
    if (unshare(CLONE_NEWNS | CLONE_NEWPID | CLONE_NEWNET | CLONE_NEWIPC) != 0) {
        return -1;
    }
    if (mount("none", "/", NULL, MS_REC | MS_PRIVATE, NULL) != 0) {
        return -2;
    }
    if (pivot_root(new_root, new_root) != 0) {
        return -3;
    }
    return drop_capabilities_and_apply_seccomp();
}`,
    },
    architecture: [
      "C Sandbox Daemon: Strict namespace, tmpfs rootfs, and seccomp-bpf execution jail.",
      "Kotlin Coroutine Service: gRPC streaming worker handling ephemeral workspace compilation and test runs.",
      "Virtual Thread Pipeline: Java 21 async pipe drainers ensuring zero thread starvation under heavy concurrency.",
      "Collaborative Web Studio: Real-time code editing and execution telemetry.",
    ],
    outcomes: [
      "High-performance isolated execution pipeline capable of running concurrent untrusted C, Python, and Java programs.",
      "Architectural foundation that paved the way for PES 2's expansion to 27 LeetCode runtime environments.",
    ],
    githubUrl: "https://github.com/piyushshukla11/polyexecution-studio",
    featured: true,
  },
  {
    id: "voyage",
    title: "Voyage — Lunar Optical Correspondence",
    subtitle: "Chandrayaan-2 planetary correspondence & crater detection system",
    category: "ai",
    tags: ["Python", "PyTorch", "YOLOv9", "FastAPI", "SPICE", "ISRO PDS4", "OpenCV", "LightGlue"],
    summary: "Automated, scale-invariant, illumination-robust image correspondence and registration system for Chandrayaan-2 optical payloads (OHRC, TMC-2, IIRS) against global lunar reference imagery (LRO NAC/WAC) with YOLOv9 crater detectors.",
    problemStatement: "Matching high-resolution lunar surface imagery from ISRO optical sensors against global lunar reference baselines suffers from up to 180° solar azimuth illumination disparities, 17x spatial resolution mismatches, and severe parallax across extreme crater topography.",
    technicalDeepDive: [
      "Multi-modal geometric pipeline parsing ISRO PDS4 products, SPICE kernels, and automated LRO NAC/WAC reference tile querying.",
      "Meta-Selection Model (MSM): LightGBM classifier routing 13-dimensional scene vectors to optimal matchers (SIFT, RIFT2, LightGlue, or Crater Matching), cutting runtime by 50%.",
      "YOLOv9 crater detection engine extracting topological landmarks invariant to extreme lunar shadow lengths.",
      "Hierarchical geometric verification ladder (Similarity -> Affine -> Homography -> Tile-wise Local Models) with DEGENSAC/MAGSAC++ outlier rejection.",
    ],
    challengesSolved: [
      "Resolved 17x spatial resolution disparities between OHRC (0.3 m/px) and TMC-2 (5 m/px) using GSD pyramid normalization.",
      "Eliminated polar divergence and planar collapse in crater terrain via tile-wise spatial budgeting.",
    ],
    metrics: [
      { label: "Resolution Invariance", value: "Up to 17x GSD" },
      { label: "Solar Angle Tolerance", value: "Up to 180° Azimuth" },
      { label: "Target Sensors", value: "OHRC / TMC-2 / IIRS" },
      { label: "Crater Model", value: "Custom YOLOv9" },
    ],
    codeHighlight: {
      language: "python",
      filename: "voyage/core/meta_selector.py",
      snippet: `# LightGBM automated meta-matcher routing for lunar optical payloads
def route_lunar_matcher(scene_features: np.ndarray) -> MatcherType:
    prediction = msm_classifier.predict(scene_features.reshape(1, -1))[0]
    if prediction == 0 and scene_features[IDX_SOLAR_INCIDENCE] > 75.0:
        return MatcherType.CRATER_YOLOV9
    return MATCHER_DISPATCH_TABLE[prediction]`,
    },
    architecture: [
      "L0 Geometry Layer: ISRO PDS4 parser, SPICE ephemeris kernels, and automated LRO reference querying.",
      "L1 Preprocessing: Shadow validity masking, radiometric normalization, and GSD scale pyramid.",
      "L2 Correspondence Engine: Pluggable M0 (SIFT), M1 (RIFT2/LNIFT), M2 (LightGlue), and M3 (Crater YOLOv9).",
      "L3 Verification: DEGENSAC/MAGSAC++ outlier rejection with hierarchical transformation ladders.",
    ],
    outcomes: [
      "Sub-pixel registration accuracy bounded within 0.10 pixels across challenging lunar terrain.",
      "Engineered as a team submission for Smart India Hackathon (SIH 2026, PS-26166).",
    ],
    githubUrl: "https://github.com/piyushshukla11/Voyage",
    featured: true,
  },
  {
    id: "prism",
    title: "PRISM Review Intelligence",
    subtitle: "Multilingual customer review diagnosis with graph and time modeling",
    category: "ai",
    tags: ["Python", "PyTorch", "FastAPI", "NetworkX", "Transformers", "React", "TypeScript"],
    summary: "Cross-channel, multilingual customer review intelligence platform that diagnoses root causes across languages using graph and time-based modeling, temporal change-point detection, and multi-label issue classification.",
    problemStatement: "Customer feedback across multiple marketplaces and languages is noisy and fragmented. High-level sentiment scores fail to tell engineering teams which specific feature version or batch caused a sudden spike in failures.",
    technicalDeepDive: [
      "Temporal change-point analysis on complaint streams using Bayesian statistical shift detection to isolate the exact commit or release date of regressions.",
      "Semantic graph modeling connecting co-occurring issue tokens, entity nouns, and severity weights into directional diagnostic graphs.",
      "Multi-label transformer classifier trained for granular failure taxonomy: physical durability, firmware bugs, UI friction, and logistics delay.",
      "Interactive graph analytics dashboard visualizing cluster centrality, sentiment velocity, and customer friction trends.",
    ],
    challengesSolved: [
      "Filtered out marketplace bot spam and repetitive promotional noise using lexical entropy and semantic density thresholds.",
      "Preserved cross-lingual semantic fidelity across Hindi, English, and regional Indian language reviews.",
    ],
    metrics: [
      { label: "Issue Taxonomy", value: "24 Categories" },
      { label: "Root-Cause Isolation", value: "Graph Centrality" },
      { label: "Temporal Accuracy", value: "Bayesian Shifts" },
      { label: "Multilingual Engine", value: "mDeBERTa" },
    ],
    codeHighlight: {
      language: "python",
      filename: "prism/graph/diagnostics.py",
      snippet: `# Graph centrality computation for issue root-cause localization
def extract_root_cause_clusters(review_nodes: list[ReviewToken]) -> list[IssueCluster]:
    graph = build_cooccurrence_graph(review_nodes, min_weight=0.35)
    centrality = nx.pagerank(graph, weight="weight")
    return [IssueCluster(node=k, score=v) for k, v in sorted(centrality.items(), key=lambda x: -x[1])[:5]]`,
    },
    architecture: [
      "Ingestion & Cleaning: Multi-channel scrapers, deduplication filters, and language normalization.",
      "Understanding Layer: Transformer-based multi-label classification and sentiment polarity extraction.",
      "Diagnostic Engine: Graph co-occurrence construction, PageRank centrality, and temporal change points.",
      "Actionable Dashboard: Interactive review graph exploration and root-cause alerts for engineering teams.",
    ],
    outcomes: [
      "Enables product engineering teams to isolate specific faulty release batches within minutes.",
      "Replaces subjective feedback summaries with verifiable graph-backed diagnostic metrics.",
    ],
    githubUrl: "https://github.com/piyushshukla11/PRISM",
    featured: true,
  },
  {
    id: "ulpin-cadastre",
    title: "3D ULPIN & Vertical Cadastre",
    subtitle: "Volumetric property mapping and strata subdivision in 3D",
    category: "systems",
    tags: ["PostGIS", "CesiumJS", "Python", "SQL", "GeoJSON", "LADM / ISO 19152"],
    summary: "A 3D spatial land administration platform generating Unique Land Parcel Identification Numbers (ULPIN) and mapping vertical multi-story apartment deeds in interactive 3D.",
    problemStatement: "Traditional land registries only represent 2D planar boundaries. In high-density vertical cities, multi-story apartments and subterranean infrastructure create complex overlapping ownership rights that cannot be legally or spatially represented in flat 2D maps.",
    technicalDeepDive: [
      "PostGIS spatial schema implementing the ISO 19152 Land Administration Domain Model (LADM) for multi-level property parcels.",
      "CesiumJS 3D Tiles streaming engine rendering volumetric glTF bounding structures with strata-level unit picking.",
      "Unique Land Parcel Identification Number (ULPIN) generator deriving 14-digit national cadastral codes from spatial coordinates.",
      "Spatial query engine resolving 3D point-in-polyhedron queries (ST_3DIntersects) for multi-story ownership rights.",
    ],
    challengesSolved: [
      "Solved level-of-detail (LOD) streaming bottlenecks for dense urban city blocks using hierarchical 3D Tiles.",
      "Eliminated boundary overlap ambiguities across vertical apartment floors through topological strata validation.",
    ],
    metrics: [
      { label: "Cadastral Standard", value: "LADM / ISO 19152" },
      { label: "Spatial Database", value: "PostGIS 3D" },
      { label: "Visual Engine", value: "CesiumJS 3D Tiles" },
      { label: "Geometry", value: "Volumetric 3D" },
    ],
    codeHighlight: {
      language: "sql",
      filename: "db/vertical_cadastre.sql",
      snippet: `-- Volumetric spatial query for 3D unit boundary intersection
SELECT unit_id, ulpin_code, owner_name, ST_AsGeoJSON(geom_3d)
FROM vertical_units
WHERE ST_3DIntersects(geom_3d, ST_MakePoint(:x, :y, :z))
AND strata_level = :floor;`,
    },
    architecture: [
      "PostGIS-Backed Spatial Model: 3D polyhedral surface definitions storing legal boundaries.",
      "LADM-Aligned Property Schema: Structured relations between parties, rights, restrictions, and responsibilities.",
      "CesiumJS 3D Tiles Visualization: High-performance browser rendering of urban topography and architectural strata.",
      "Search & Verification Portal: Fast lookup by citizen identity, national ULPIN code, or spatial map click.",
    ],
    outcomes: [
      "Makes complex vertical property relationships intuitively explorable in interactive 3D.",
      "Engineered as a team submission for Smart India Hackathon (SIH26011).",
    ],
    githubUrl: "https://github.com/piyushshukla11/3D_ULPIN",
    featured: true,
  },
  {
    id: "prospectusiq",
    title: "ProspectusIQ",
    subtitle: "Automated SME IPO offer drafting & deterministic SEBI compliance",
    category: "ai",
    tags: ["Python", "FastAPI", "TypeScript", "Next.js", "SEBI Rules Engine", "RAG"],
    summary: "A financial compliance platform designed to automate and audit the drafting of SME IPO offer documents (DRHPs) by gating LLMs behind deterministic SEBI regulation validation.",
    problemStatement: "Drafting SME IPO prospectuses (DRHPs) takes weeks of merchant banker and legal effort. Relying on raw unconstrained generative AI produces hallucinated financial statements and subtle violations of strict SEBI ICDR regulations.",
    technicalDeepDive: [
      "Three-tier architecture: Generative LLM drafting agent, hardcoded deterministic SEBI ICDR rule checker, and merchant banker audit interface.",
      "Deterministic legal validation engine enforcing mandatory disclosures, risk factors, peer financial metrics, and promoter holding caps.",
      "Human-in-the-loop certification pipeline where merchant bankers and securities lawyers verify every AI-generated clause.",
      "Automated financial table reconciliation verifying balance sheet arithmetic and cross-year growth rates before export.",
    ],
    challengesSolved: [
      "Completely prevented AI financial hallucinations by enforcing strict schema validation against audited company ledger inputs.",
      "Cut preliminary DRHP draft generation time from 14 days to under 4 hours.",
    ],
    metrics: [
      { label: "Compliance Standard", value: "SEBI ICDR Regulations" },
      { label: "Drafting Speedup", value: ">80% Faster" },
      { label: "Verification Model", value: "Deterministic Rule Gate" },
      { label: "Audit Trail", value: "Full Human Sign-off" },
    ],
    codeHighlight: {
      language: "python",
      filename: "prospectus/rules/sebi_icdr.py",
      snippet: `# Deterministic compliance check for SME IPO promoter contribution
def verify_promoter_contribution(drhp: ProspectusDraft) -> ComplianceResult:
    min_contribution = drhp.post_issue_capital * 0.20
    if drhp.promoter_holding < min_contribution:
        return ComplianceResult(valid=False, error="SEBI ICDR 236: Promoter holding below 20%")
    return ComplianceResult(valid=True)`,
    },
    architecture: [
      "Document Extraction & Ledger Parsing: Ingestion of audited financial statements and board resolutions.",
      "Drafting Agent: Context-aware section generator generating preliminary disclosures.",
      "Deterministic SEBI Rule Engine: Static validator checking compliance rules with zero tolerance for hallucinations.",
      "Intermediary Certification UI: Role-based interface for merchant bankers and legal counsel to sign off.",
    ],
    outcomes: [
      "Brings mathematical determinism and legal accountability to AI document automation in Indian capital markets.",
    ],
    githubUrl: "https://github.com/piyushshukla11/ProspectusIQ",
    featured: true,
  },
  {
    id: "sonar-rag",
    title: "SONAR — Voice-Driven Multilingual RAG",
    subtitle: "Low-latency voice speech-to-text RAG engine with guardrail validation",
    category: "ai",
    tags: ["FastAPI", "Python", "Sarvam STT", "Vector Search", "Guardrails", "React"],
    summary: "A low-latency voice-enabled retrieval-augmented generation engine built for Indian regional languages with Sarvam speech models, semantic vector search, and strict response guardrails.",
    problemStatement: "Voice interfaces in multilingual regional environments suffer from compound latency across STT, vector search, LLM completion, and TTS, while risking hallucinated outputs on critical public information queries.",
    technicalDeepDive: [
      "Integrated Sarvam AI speech-to-text pipeline supporting rapid streaming audio transcription across Indian languages.",
      "FastAPI asynchronous streaming backend achieving end-to-end audio-in to answer-out latency under 1.8 seconds.",
      "Semantic vector retrieval with hybrid keyword-vector indexing to ensure accurate domain fact retrieval.",
      "Output guardrail verification pipeline preventing out-of-domain answers and hallucinations.",
    ],
    challengesSolved: [
      "Maintained accurate phonetic interpretation for regional dialect nuances and code-switched Hindi-English speech.",
      "Optimized streaming chunk sizes to prevent audio buffer underflows on mobile connections.",
    ],
    metrics: [
      { label: "End-to-End Latency", value: "<1.8s" },
      { label: "Speech Engine", value: "Sarvam AI" },
      { label: "Backend", value: "FastAPI Async" },
      { label: "Multilingual", value: "Indian Languages" },
    ],
    codeHighlight: {
      language: "python",
      filename: "app/stt/sarvam_client.py",
      snippet: `# Asynchronous streaming STT transcription with Sarvam client
async def transcribe_speech_stream(audio_bytes: bytes, language_code: str) -> str:
    response = await http_client.post(
        SARVAM_STT_ENDPOINT,
        headers={"api-subscription-key": settings.SARVAM_API_KEY},
        files={"file": ("audio.wav", audio_bytes, "audio/wav")},
        data={"language_code": language_code, "model": "saaras:v1"}
    )
    return response.json().get("transcript", "")`,
    },
    architecture: [
      "Voice Ingestion: Browser audio capture streaming 16kHz PCM chunks via WebSocket / HTTP.",
      "Sarvam STT Layer: Real-time speech-to-text decoding with automatic language identification.",
      "Hybrid RAG Pipeline: Vector similarity search combined with BM25 keyword boosting.",
      "Guardrail Filter: Context-grounding validator checking answer fidelity against retrieved knowledge.",
    ],
    outcomes: [
      "Engineered as a team project for Goa Hackathon 2026.",
      "Delivered an accessible voice search experience for users querying complex regional datasets.",
    ],
    githubUrl: "https://github.com/piyushshukla11/rag-goa-2026",
    featured: true,
  },
  {
    id: "mistakememo",
    title: "MistakeMemo",
    subtitle: "Local-first experience-learning layer for AI-assisted debugging",
    category: "systems",
    tags: ["TypeScript", "Node.js", "VS Code Extension", "Vector DB", "AST Parser"],
    summary: "A local-first developer tool and VS Code extension that observes debugging activity, extracts failed approaches and regression tests into structured memory, and primes LLMs with prior problem-solving context.",
    problemStatement: "Developers and AI coding agents constantly repeat failed approaches during multi-hour debugging sessions because LLM context windows reset and knowledge of what didn't work is lost.",
    technicalDeepDive: [
      "VS Code extension observing permitted terminal test runs, file diffs, and stack trace evolutions in the background.",
      "Structured experience extractor isolating hypotheses, failed patches, and compiler/test error codes into discrete experience nodes.",
      "Local vector and graph database storing experiences indexed by error signature and code AST fingerprints.",
      "Context primer generating compact MISTAKEMEMO_REPORT prompt injections that prevent LLMs from retrying known failing patterns.",
    ],
    challengesSolved: [
      "Zero developer interruption: Operates completely passively without requiring manual notes or prompt writing.",
      "Preserved developer privacy by storing all code hashes and debugging logs strictly on localhost.",
    ],
    metrics: [
      { label: "Storage Model", value: "Local-First / Private" },
      { label: "Extension Host", value: "VS Code API" },
      { label: "Context Injection", value: "MISTAKEMEMO_REPORT" },
      { label: "Extraction", value: "Passive AST/Test Diff" },
    ],
    codeHighlight: {
      language: "typescript",
      filename: "extension/src/memory/experience-tracker.ts",
      snippet: `// Observe test execution failures and extract failed debugging hypothesis
export function recordFailedHypothesis(session: DebugSession, errorLog: string): void {
  const astFingerprint = computeAstHash(session.modifiedFiles);
  const experienceNode: ExperienceEntry = {
    id: crypto.randomUUID(),
    signature: extractErrorSignature(errorLog),
    astFingerprint,
    failedApproach: session.lastDiffSummary,
    timestamp: Date.now(),
  };
  localVectorStore.insert(experienceNode);
}`,
    },
    architecture: [
      "VS Code Observer: Hooks into workspace edits, terminal test executions, and git diff snapshots.",
      "Experience Extractor: Identifies failed hypotheses and error codes from test outputs.",
      "Local Vector Memory: Fast embedded embedding store linking error signatures to prior solutions.",
      "LLM Prompt Injector: Automatically formats prior failure insights into actionable system prompts.",
    ],
    outcomes: [
      "Engineered as a team hackathon project for Devcrest Hackathon.",
      "Significantly reduces repetitive debugging cycles by preserving session memory.",
    ],
    githubUrl: "https://github.com/piyushshukla11/DevcrestHack",
    featured: true,
  },
  {
    id: "highway-compliance",
    title: "Automated Highway Route Compliance",
    subtitle: "Computer vision toll monitoring & route tracking system",
    category: "systems",
    tags: ["Python", "OpenCV", "YOLO", "CNN", "FASTag RFID", "PostgreSQL"],
    summary: "An AI-driven smart toll monitoring and route compliance solution using ANPR, CNN vehicle classification, and RFID verification to compute dynamic distance-based tolls and detect evasion.",
    problemStatement: "Fixed toll plazas create lengthy highway queues, cause fuel wastage, and enable commercial vehicle toll evasion through illegal bypass routes or wrong-class FASTag tags.",
    technicalDeepDive: [
      "Automatic Number Plate Recognition (ANPR) pipeline utilizing YOLO object detection and CRNN character recognition on high-speed vehicle video feeds.",
      "CNN-based vehicle dimension and axle classification verifying FASTag vehicle class integrity (detecting car tags on heavy trucks).",
      "Route timestamp verification engine matching entry and exit checkpoint vectors to compute exact distance traveled and flag unauthorized stops.",
      "Real-time event streaming pipeline pushing automated evasion alerts to highway patrol authorities.",
    ],
    challengesSolved: [
      "Achieved high license plate recognition accuracy under adverse conditions (glare, night rain, angled plates).",
      "Prevented toll evasion through automated cross-validation between optical plate numbers and RFID tag data.",
    ],
    metrics: [
      { label: "ANPR Accuracy", value: ">96.4%" },
      { label: "Vehicle Classifier", value: "Multi-Class CNN" },
      { label: "Verification", value: "RFID / FASTag Match" },
      { label: "Architecture", value: "Distributed Checkpoints" },
    ],
    codeHighlight: {
      language: "python",
      filename: "compliance/engine/route_checker.py",
      snippet: `# Dynamic toll calculation and route compliance verification
def evaluate_highway_compliance(entry_log: TollEvent, exit_log: TollEvent) -> TollResult:
    expected_travel_min = calculate_min_travel_time(entry_log.booth_id, exit_log.booth_id)
    elapsed_time = (exit_log.timestamp - entry_log.timestamp).total_seconds() / 60.0
    is_speeding = elapsed_time < (expected_travel_min * 0.8)
    toll_amount = calculate_distance_toll(entry_log.vehicle_class, entry_log.booth_id, exit_log.booth_id)
    return TollResult(toll=toll_amount, speeding_violation=is_speeding)`,
    },
    architecture: [
      "Edge Camera Nodes: High-speed video ingestion capturing front and rear vehicle frames.",
      "Vision Pipeline: YOLO plate bounding box extraction + OCR character decoding.",
      "RFID Cross-Matcher: Verification of physical plate against FASTag transponder ID.",
      "Route Compliance Engine: Calculation of trajectory, distance, and automated evasion flags.",
    ],
    outcomes: [
      "Eliminates highway bottleneck stops while safeguarding public toll revenue integrity.",
    ],
    githubUrl: "https://github.com/piyushshukla11/Automated-Highway-Route-Compliance-System",
    featured: true,
  },
  {
    id: "cpulse-tracker",
    title: "CPulse — Competitive Programming Tracker",
    subtitle: "Unified telemetry & performance analytics across Codeforces & CodeChef",
    category: "systems",
    tags: ["TypeScript", "Next.js", "Tailwind CSS", "Codeforces API", "CodeChef API"],
    summary: "A unified competitive programming analytics platform aggregating contest ratings, problem-solving telemetry, and submission progression heatmaps across Codeforces and CodeChef.",
    problemStatement: "Competitive programmers participate across multiple distinct judges with separate rating formulas and no consolidated progress tracking, making it hard to identify problem topic weaknesses.",
    technicalDeepDive: [
      "Asynchronous telemetry scrapers syncing contest histories, rating graphs, and problem verdicts from official judge APIs.",
      "Unified performance scoring model normalizing Codeforces and CodeChef ratings into standardized skill percentiles.",
      "Topic tag mastery radar analyzing solve speed and accuracy across dynamic programming, graph algorithms, and number theory.",
      "Real-time contest calendar alerting users to upcoming global rounds with time-zone adjustments.",
    ],
    challengesSolved: [
      "Handled strict judge API rate limits with intelligent local caching and background revalidation.",
      "Designed clean interactive heatmaps representing multi-year problem-solving streaks.",
    ],
    metrics: [
      { label: "Supported Platforms", value: "Codeforces & CodeChef" },
      { label: "Data Pipeline", value: "Async Revalidation" },
      { label: "Analytics", value: "Skill Mastery Radar" },
      { label: "Telemetry", value: "Rating Shift History" },
    ],
    codeHighlight: {
      language: "typescript",
      filename: "lib/judges/unified-rating.ts",
      snippet: `// Normalize multi-platform competitive programming ratings
export function computeUnifiedRating(cfRating: number, ccRating: number): number {
  if (cfRating <= 0) return ccRating;
  if (ccRating <= 0) return cfRating;
  // Weighted Gaussian normalization across competitive tiers
  const normalizedCf = cfRating * 1.05;
  const normalizedCc = ccRating * 0.95;
  return Math.round((normalizedCf * 0.6) + (normalizedCc * 0.4));
}`,
    },
    architecture: [
      "API Synchronization Layer: Rate-bounded workers polling judge endpoints.",
      "Normalization Engine: Rating percentile calculations and tag difficulty mapping.",
      "Analytics Dashboard: Topic weakness heatmaps, contest delta graphs, and streak visualization.",
      "Contest Notification Scheduler: Calendar synchronization for upcoming international contests.",
    ],
    outcomes: [
      "Consolidates fragmented competitive programming metrics into a single high-performance dashboard.",
    ],
    githubUrl: "https://github.com/piyushshukla11/CPulse-Tracker",
    featured: true,
  },
];

export function getProject(id: string): PortfolioProject | undefined {
  return featuredProjects.find((p) => p.id === id);
}

export function getAllProjects(): PortfolioProject[] {
  return featuredProjects;
}
