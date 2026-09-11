const normalizeSender = (s) => {
    if (!s) return null;
    return s.trim().replace(/\s*\(\d+\s*messages?\)/gi, '').trim().toLowerCase();
};

console.log('--- Sender Normalization Test ---');
const tests = [
    { input: "Gowtham.A", expected: "gowtham.a" },
    { input: "GOWTHAM.A", expected: "gowtham.a" },
    { input: "Gowtham.A (2 messages)", expected: "gowtham.a" },
    { input: "GOWTHAM.A (6 messages)", expected: "gowtham.a" },
    { input: "  Gowtham.A  ", expected: "gowtham.a" }
];

let allPassed = true;
tests.forEach(t => {
    const result = normalizeSender(t.input);
    if (result !== t.expected) {
        console.error(`FAIL! Input: "${t.input}" | Expected: "${t.expected}" | Got: "${result}"`);
        allPassed = false;
    } else {
        console.log(`PASS: "${t.input}" -> "${result}"`);
    }
});

if (allPassed) {
    console.log("All normalization tests PASSED.");
} else {
    console.error("Some normalization tests FAILED.");
    process.exit(1);
}
