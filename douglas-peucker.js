function getSquareDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
}

function getSquareSegmentDistance(p, p1, p2) {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.x;
            y = p2.y;
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}

function simplifyDouglasPeucker(points, tolerance) {
    if (points.length <= 2) {
        return points;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    let index = -1;
    let dist = 0;

    for (let i = 1; i < points.length - 1; i++) {
        const cdist = getSquareSegmentDistance(points[i], firstPoint, lastPoint);
        if (cdist > dist) {
            dist = cdist;
            index = i;
        }
    }

    if (dist > tolerance * tolerance) {
        const l = points.slice(0, index + 1);
        const r = points.slice(index);
        const l1 = simplifyDouglasPeucker(l, tolerance);
        const r1 = simplifyDouglasPeucker(r, tolerance);
        return l1.slice(0, l1.length - 1).concat(r1);
    } else {
        return [firstPoint, lastPoint];
    }
}