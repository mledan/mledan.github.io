function encode(data) {
    if (!data || data.length === 0) {
        return [];
    }

    const encoded = [];
    let count = 1;
    let current = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i] === current) {
            count++;
        } else {
            encoded.push(count, current);
            count = 1;
            current = data[i];
        }
    }

    encoded.push(count, current);
    return encoded;
}

function decode(encoded) {
    const decoded = [];

    for (let i = 0; i < encoded.length; i += 2) {
        const count = encoded[i];
        const value = encoded[i + 1];
        for (let j = 0; j < count; j++) {
            decoded.push(value);
        }
    }

    return decoded;
}
