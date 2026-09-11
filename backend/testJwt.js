const jwt = require('jsonwebtoken');

jwt.verify('fake', undefined, (err) => {
    console.log("VERIFY UNDEFINED SECRET ERROR:", err?.message);
});

try {
    jwt.sign({ id: '123' }, undefined, { expiresIn: '15m' });
} catch(e) {
    console.log("SIGN UNDEFINED SECRET ERROR:", e.message);
}
