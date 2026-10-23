/* Ten particle roses in folded paper: sparse dots give the paper its own
   texture, while thin continuous curves describe its rolled edges and folds.
   The paper billows, the roses nod and motes of light drift up from them. */
class ParticleBouquet {
    constructor({ mobile = false } = {}) {
        this.group = new THREE.Group();
        const positions = [], colors = [], sizes = [], opacities = [], shimmers = [], kinds = [], phases = [];
        const linePositions = [], lineColors = [], lineOpacities = [];
        const stream = start => {
            let state = start;
            return () => {
                state = (state * 1664525 + 1013904223) >>> 0;
                return state / 4294967296;
            };
        };
        const random = stream(2010);
        const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
        // A hidden dot still draws its random values, so hiding one never
        // reshuffles the dots generated after it; later layers of dots draw
        // from their own streams for the same reason. `kind` tells the shader
        // how a dot drifts: paper billows, each rose nods on its own `phase`,
        // and motes rise and fade.
        const dotsFrom = (rng, { shimmer = 0, kind = 0 } = {}) =>
            (x, y, z, color, size = 1.25, opacity = 0.85, hidden = false, phase = 0) => {
                const scale = 0.7 + rng() * 0.65;
                const strength = 0.72 + rng() * 0.28;
                if (hidden) return;
                positions.push(x, y, z);
                colors.push(...color);
                sizes.push(size * scale);
                opacities.push(opacity * strength);
                shimmers.push(shimmer);
                kinds.push(kind);
                phases.push(phase);
            };
        const PAPER = 1, ROSE = 2, MOTE = 3;
        const add = dotsFrom(random);
        const addPaper = dotsFrom(random, { kind: PAPER });
        const blooms = [
            [-12, 26, -2, 5.7], [1, 28, -3, 5.9], [14, 24, -1, 5.7],
            [-20, 13, 2, 5.8], [-7, 14, 6, 6.1], [7, 14, 7, 6.2], [21, 11, 2, 5.5],
            [-13, 0, 7, 6.0], [1, -2, 11, 6.4], [15, -2, 7, 5.9]
        ];
        const ROSE_SCALE = 1.12;
        // Additive dots cannot occlude, so whatever sits behind a rose face
        // is left out to keep the blooms clean.
        const behindBloom = (x, y) => blooms.some(([bx, by, , r]) =>
            (x - bx) ** 2 + ((y - by) / 0.93) ** 2 < (r * ROSE_SCALE * 0.92) ** 2);
        const surface = (columns, rows, sample, density = 1) => {
            const count = Math.max(1, Math.round(columns * rows * (mobile ? 0.019 : 0.024) * density));
            for (let i = 0; i < count; i++) {
                sample(random(), random());
            }
        };
        const path = (count, sample) => {
            for (let i = 0; i < count; i++) {
                sample((i + random() * 0.6) / count);
            }
        };

        const cubic = (control, t) => control[0].map((_, axis) => {
            const k = 1 - t;
            return k * k * k * control[0][axis]
                + 3 * k * k * t * control[1][axis]
                + 3 * k * t * t * control[2][axis]
                + t * t * t * control[3][axis];
        });

        // Preserve the paper's sampling budget and random calls: changing its
        // shape must not regenerate the flowers and leaves that were approved.
        const washRandom = stream(3030);
        const addWash = dotsFrom(washRandom, { shimmer: 1, kind: PAPER });
        const paper = (origin, left, right, tint, fold = 0, lip = null) => {
            const point = (u, v) => {
                const top = lip ? cubic(lip, u) : mix(left, right, u);
                if (!lip) top[1] += Math.sin(u * Math.PI) * 0.6;
                const p = mix(origin, top, Math.sqrt(v));
                p[2] += Math.sin(u * Math.PI * 2 + fold) * v * 1.8;
                return p;
            };
            surface(80, 115, (u, v) => {
                const p = point(u, v);
                const crease = Math.abs(u - 0.52);
                const shade = 0.76 + 0.2 * u + crease * 0.1;
                const edge = v > 0.975 ? [1, 0.88, 0.86] : tint.map(c => c * shade);
                addPaper(...p, edge, 1.15, 0.46, !lip && behindBloom(p[0], p[1]));
            }, 0.95);
            // A faint wash of fine dots fills the sheet in, so the wrap reads
            // as soft paper rather than an empty outline.
            const wash = lip ? (mobile ? 230 : 320) : (mobile ? 700 : 920);
            for (let i = 0; i < wash; i++) {
                const u = washRandom(), v = washRandom();
                const p = point(u, v);
                const paperTone = tint.map(c => Math.min(1, c * (0.84 + 0.16 * u) + 0.04));
                addWash(...p, mix(paperTone, [1, 0.6, 0.74], 0.35),
                    0.9, lip ? 0.3 : 0.38, !lip && behindBloom(p[0], p[1]));
            }
        };
        paper([0, -29, -10], [-22, 42, -12], [12, 48, -14], [0.96, 0.85, 0.82]);
        paper([-3, -29, -1], [-37, 21, -3], [-22, 32, -6], [0.95, 0.66, 0.69], 0.8);
        paper([2, -29, -5], [12, 44, -12], [27, 43, -11], [0.94, 0.87, 0.82], 1.2);
        paper([3, -29, 2], [27, 33, -7], [38, 22, 0], [1, 0.74, 0.76], 0.5);

        // Stems converge at the ribbon. Leaves sit between, rather than over,
        // the rose faces so the bouquet keeps a distinct floral silhouette.
        const leaf = (x, y, z, length, angle, width = 0.32) => {
            surface(13, 25, (u, v) => {
                const across = (u * 2 - 1) * Math.sin(v * Math.PI) * length * width;
                const along = v * length;
                const px = x + Math.sin(angle) * along + Math.cos(angle) * across;
                const py = y + Math.cos(angle) * along - Math.sin(angle) * across;
                const pz = z + Math.sin(v * Math.PI) * 1.1 - Math.abs(across) * 0.17;
                const vein = Math.abs(u - 0.5) < 0.055;
                const light = 0.7 + u * 0.25 + Math.sin(v * Math.PI) * 0.15;
                add(px, py, pz, vein ? [0.28, 0.85, 0.23]
                    : [0.15 * light, 0.68 * light, 0.18 * light], 1.45, 0.85, behindBloom(px, py));
            });
            // Dotted edges make each leaf legible even with very little fill.
            [-1, 1].forEach(side => path(12, v => {
                const across = side * Math.sin(v * Math.PI) * length * width;
                const along = v * length;
                const px = x + Math.sin(angle) * along + Math.cos(angle) * across;
                const py = y + Math.cos(angle) * along - Math.sin(angle) * across;
                add(px, py, z + Math.sin(v * Math.PI) * 1.1 - Math.abs(across) * 0.17,
                    [0.14, 0.78, 0.22], 1.4, 0.85, behindBloom(px, py));
            }));
        };
        this.bloomCount = blooms.length;
        blooms.forEach(([x, y, z], index) => {
            path(25, v => {
                const px = x * v + Math.sin(v * Math.PI) * 0.45, py = -29 + (y + 29) * v;
                add(px, py, -2 + (z + 2) * v, [0.12, 0.82, 0.18], 1.4, 0.8, behindBloom(px, py));
            });
            leaf(x * 0.85, y - 3, z - 3, 8 + random() * 4,
                Math.sign(x || 1) * (0.7 + random() * 0.9));
            if (index < 7) leaf(x, y, z - 4, 7, -0.6 + random() * 1.2);
        });
        [[-24, 11, -1, 12, -0.3], [-16, 25, -5, 12, -0.4],
            [19, 21, -4, 13, 0.3], [25, 3, 0, 10, 0.6],
            [-20, -2, 0, 9, -0.65], [15, -15, 1, 9, 1.1]]
            .forEach(args => leaf(...args));

        // Each rose is a cluster of deep pink-red dots. Lighter beaded rims
        // trace its cupped petals, whose ends tuck in towards the next ring,
        // and a spiral marks the bud. Their own random stream leaves every
        // later dot unchanged.
        const roseRandom = stream(1020);
        const addRose = dotsFrom(roseRandom, { kind: ROSE });
        const rimSpacing = mobile ? 0.62 : 0.52;
        const TUCK = 0.3;
        blooms.forEach(([cx, cy, cz, baseRadius], bloomIndex) => {
            const radius = baseRadius * ROSE_SCALE;
            const phase = roseRandom() * Math.PI * 2;
            // Every rose is red so it stands out from the pink paper; a few
            // lean crimson rather than scarlet so they are not identical.
            const crimson = bloomIndex % 3 === 0;
            const rimTint = crimson ? [1, 0.24, 0.3] : [1, 0.3, 0.26];
            const bodyTint = crimson ? [0.86, 0.02, 0.1] : [0.94, 0.04, 0.05];
            // Petals facing the upper left catch more light.
            const lit = angle => 0.72 + 0.28 * Math.cos(angle + 2.3);
            const nod = (bloomIndex * 0.618) % 1;
            const dot = (x, y, layer, color, size, opacity) =>
                addRose(cx + x, cy + y * 0.93, cz + radius * (0.2 + layer * 0.16), color, size, opacity, false, nod);
            [[1, 5, 1.05], [0.78, 5, 1.15], [0.57, 4, 1.4], [0.38, 3, 1.9]]
                .forEach(([reach, petals, span], layer) => {
                    for (let petal = 0; petal < petals; petal++) {
                        const center = phase + layer * 0.9 + petal / petals * Math.PI * 2
                            + (roseRandom() - 0.5) * 0.3;
                        const r = radius * reach * (0.94 + roseRandom() * 0.1);
                        const fill = Math.round((mobile ? 16 : 22) * reach);
                        for (let i = 0; i < fill; i++) {
                            const a = center + (roseRandom() - 0.5) * span * 1.1;
                            const depth = Math.sqrt(roseRandom());
                            const rr = r * (0.45 + depth * 0.5);
                            dot(Math.cos(a) * rr, Math.sin(a) * rr, layer - 0.5,
                                bodyTint.map(c => c * (0.65 + depth * 0.35) * lit(a)), 1.15, 0.8);
                        }
                        const reachAngle = span / 2 + TUCK;
                        const steps = Math.max(4, Math.round(r * reachAngle * 2 / rimSpacing));
                        for (let i = 0; i <= steps; i++) {
                            const u = i / steps * 2 - 1;
                            const a = center + u * reachAngle;
                            const tuck = Math.max(0, Math.abs(u) * reachAngle - span / 2) / TUCK;
                            const rr = r * (1 - 0.1 * u * u - tuck * 0.16);
                            dot(Math.cos(a) * rr, Math.sin(a) * rr, layer,
                                rimTint.map(c => Math.min(1, c * lit(a) * (1 - tuck * 0.35))), 1, 0.95);
                        }
                    }
                });
            const spiralSteps = mobile ? 18 : 24;
            for (let i = 0; i <= spiralSteps; i++) {
                const t = i / spiralSteps;
                const a = phase + t * Math.PI * 4.2;
                const rr = radius * (0.27 - t * 0.23);
                dot(Math.cos(a) * rr, Math.sin(a) * rr, 4, rimTint.map(c => c * (0.95 - t * 0.25)), 1, 0.95);
            }
        });

        // A broad collar sweeps under the roses. Its two lips stay on the
        // same side of the neck instead of crossing into a wire-frame X.
        const collarTop = [[-31, 1, 12], [-25, -12, 16], [0, -20, 18], [26, -5, 14]];
        const collarBottom = [[-26, -10, 13], [-17, -19, 16], [4, -26, 17], [19, -16, 14]];
        paper([0, -30, 9], collarTop[0], collarTop[3], [0.99, 0.77, 0.78], 1.4, collarTop);
        paper([0, -30, 10], collarBottom[0], collarBottom[3], [1, 0.82, 0.81], 0.6, collarBottom);
        const paperCurve = (control, opacity = 0.82, tint = [1, 0.73, 0.8]) => {
            for (let step = 0; step < 40; step++) {
                linePositions.push(...cubic(control, step / 40), ...cubic(control, (step + 1) / 40));
                lineColors.push(...tint, ...tint);
                lineOpacities.push(opacity, opacity);
            }
        };

        // Tall, offset back sheets have nearly straight cut edges and one
        // rolled corner, like the ivory and blush sheets in the reference.
        paperCurve([[-22, 28, -10], [-23, 34, -11], [-22, 39, -12], [-22, 42, -12]], 0.65);
        paperCurve([[-22, 42, -12], [-11, 43, -13], [2, 46, -14], [12, 48, -14]], 0.88);
        paperCurve([[12, 48, -14], [12, 44, -14], [12, 39, -13], [12, 35, -12]], 0.56);
        paperCurve([[-22, 42, -12], [-25, 42, -10], [-25, 39, -9], [-22, 39, -10]], 0.58);
        paperCurve([[12, 44, -12], [17, 44, -12], [23, 44, -12], [27, 43, -11]], 0.72);
        paperCurve([[27, 43, -11], [27, 38, -10], [26, 32, -9], [26, 27, -7]], 0.74);

        // Separate, pointed wings flare outward. They end at the front lip;
        // there is no continuous outline enclosing the entire bouquet.
        const leftRim = [[-22, 32, -6], [-27, 29, -6], [-34, 25, -4], [-37, 21, -3]];
        paperCurve(leftRim, 0.88);
        paperCurve(leftRim.map(([x, y, z]) => [x + 0.15, y - 0.35, z + 0.18]), 0.3);
        paperCurve([[-37, 21, -3], [-36, 15, -1], [-33, 8, 5], [-31, 1, 12]], 0.84);
        paperCurve([[-31, 1, 12], [-33, -3, 13], [-30, -7, 14], [-26, -10, 13]], 0.68);

        const rightRim = [[27, 33, -7], [31, 30, -6], [35, 25, -2], [38, 22, 0]];
        paperCurve(rightRim, 0.88);
        paperCurve(rightRim.map(([x, y, z]) => [x - 0.25, y - 0.3, z + 0.18]), 0.3);
        paperCurve([[38, 22, 0], [36, 17, 2], [33, 10, 6], [30, 5, 10]], 0.84);
        paperCurve([[30, 5, 10], [26, 8, 14], [24, 3, 15], [26, -5, 14]], 0.72);
        paperCurve([[33, 14, 5], [32, 10, 8], [29, 5, 11], [27, 1, 13]], 0.36);

        // The front collar is a curved strip, with a faint underside showing
        // its thickness. Below it, two short folds gather at the ribbon.
        paperCurve(collarTop, 0.94, [1, 0.83, 0.83]);
        paperCurve(collarTop.map(([x, y, z]) => [x, y - 0.4, z + 0.12]), 0.34);
        paperCurve(collarBottom, 0.74);
        paperCurve([[26, -5, 14], [24, -9, 16], [22, -13, 16], [19, -16, 14]], 0.62);
        paperCurve([[-26, -10, 13], [-18, -21, 14], [-7, -25, 12], [-5, -28, 10]], 0.72);
        paperCurve([[19, -16, 14], [15, -22, 14], [8, -25, 12], [5, -28, 10]], 0.72);

        // Loose, asymmetric paper ends below the knot, with short pleats.
        paperCurve([[-5, -29, 5], [-8, -34, 6], [-11, -41, 5], [-13, -46, 4]], 0.58);
        paperCurve([[-13, -46, 4], [-12, -47, 4], [-10, -48, 4], [-7, -48, 4]], 0.48);
        paperCurve([[-7, -48, 4], [-2, -47, 5], [5, -49, 5], [11, -48, 4]], 0.45);
        paperCurve([[5, -29, 5], [7, -34, 6], [12, -42, 5], [11, -48, 4]], 0.58);
        paperCurve([[-2, -33, 6], [-2, -38, 7], [-3, -43, 6], [-3, -47, 5]], 0.28);
        paperCurve([[7, -35, 6], [6, -39, 7], [5, -44, 6], [4, -47, 5]], 0.25);
        surface(95, 48, (u, v) => {
            const angle = u * Math.PI * 2;
            const r = 4 + v * 7.2;
            const fold = Math.cos(angle * 7) * 0.45;
            const light = 0.75 + Math.sin(angle) * 0.12 + Math.cos(angle * 7) * 0.035;
            addPaper(Math.cos(angle) * (r + fold), -29 - v * 20,
                Math.sin(angle) * r * 0.48 + 3,
                [light, light * 0.6, light * 0.7], 1.0, 0.23);
        }, 0.4);
        [-1, 1].forEach(side => {
            path(32, u => {
                const a = u * Math.PI;
                add(side * Math.sin(a) * 10.5, -29 + Math.sin(a * 2) * 3.5,
                    15 + Math.sin(a) * 2.6, [1, 0.28, 0.5], 1.45, 0.7);
            });
            path(13, v => add(side * (1.8 + v * 5), -30 - v * 18,
                15 + Math.sin(v * Math.PI * 2) * 1.4, [0.9, 0.24, 0.42], 1.2, 0.6));
            surface(65, 24, (u, v) => {
                const a = u * Math.PI;
                const width = (v - 0.5) * 3.2;
                const x = side * (Math.sin(a) * 10.5 + width * Math.sin(a));
                const y = -29 + Math.sin(a * 2) * 3.5 + width * Math.cos(a);
                const z = 15 + Math.sin(a) * 2.6 + Math.cos(v * Math.PI) * 0.55;
                const light = 0.7 + Math.sin(a) * 0.19 + Math.cos(v * Math.PI * 2) * 0.07;
                add(x, y, z, [light + 0.1, light * 0.4, light * 0.55], 1.15, 0.5);
            }, 0.65);
            surface(16, 62, (u, v) => {
                const width = (u - 0.5) * 3.8;
                const light = 0.68 + Math.cos(u * Math.PI * 2 + v * 4) * 0.13;
                add(side * (1.8 + v * 5) + width, -30 - v * 18 + Math.sin(u * Math.PI) * v,
                    15 + Math.sin(v * Math.PI * 2) * 1.4,
                    [light + 0.14, light * 0.4, light * 0.55], 1.05, 0.38);
            }, 0.65);
        });
        surface(18, 16, (u, v) => add((u - 0.5) * 3.8, -30.6 + v * 3.5,
            18 + Math.sin(u * Math.PI) * 0.8, [0.95, 0.45 + v * 0.13, 0.6], 1.2, 0.6));

        // Pink dust fills the wrap inside its outline, mostly over the wings
        // and the lower body, where the sheets alone leave it bare.
        const outline = (curves, steps = 8) => curves.flatMap(control =>
            Array.from({ length: steps }, (_, i) => cubic(control, i / steps)));
        const flip = control => control.slice().reverse();
        const wrapOutline = outline([
            flip([[-26, -10], [-18, -21], [-7, -25], [-5, -28]]),
            flip([[-31, 1], [-33, -3], [-30, -7], [-26, -10]]),
            flip([[-37, 21], [-36, 15], [-33, 8], [-31, 1]]),
            flip(leftRim), [[-22, 32], [-22, 36], [-22, 39], [-22, 42]],
            [[-22, 42], [-11, 43], [2, 46], [12, 48]], [[12, 48], [12, 47], [12, 45], [12, 44]],
            [[12, 44], [17, 44], [23, 44], [27, 43]], [[27, 43], [27, 40], [27, 36], [27, 33]],
            rightRim, [[38, 22], [36, 17], [33, 10], [30, 5]], [[30, 5], [26, 8], [24, 3], [26, -5]],
            [[26, -5], [24, -9], [22, -13], [19, -16]], [[19, -16], [15, -22], [8, -25], [5, -28]]
        ]);
        const handleOutline = outline([
            [[-5, -29], [-8, -34], [-11, -41], [-13, -46]], [[-13, -46], [-12, -47], [-10, -48], [-7, -48]],
            [[-7, -48], [-2, -47], [5, -49], [11, -48]], flip([[5, -29], [7, -34], [12, -42], [11, -48]])
        ]);
        const inside = (x, y, polygon) => {
            let hit = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
                if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
            }
            return hit;
        };
        const dustRandom = stream(5050);
        const addDust = dotsFrom(dustRandom, { shimmer: 1, kind: PAPER });
        const dust = (polygon, [x0, x1, y0, y1], count, opacity, keep) => {
            for (let placed = 0, attempt = 0; placed < count && attempt < count * 30; attempt++) {
                const x = x0 + dustRandom() * (x1 - x0), y = y0 + dustRandom() * (y1 - y0);
                if (!inside(x, y, polygon) || dustRandom() > keep(y) || behindBloom(x, y)) continue;
                const color = mix([1, 0.36, 0.56], [1, 0.62, 0.76], dustRandom())
                    .map(c => c * (0.86 + dustRandom() * 0.14));
                addDust(x, y, (y < -4 ? 11 : 1) + (dustRandom() - 0.5) * 3, color, 1, opacity);
                placed++;
            }
        };
        dust(wrapOutline, [-38, 38, -29, 48], mobile ? 1000 : 1350, 0.52, y => y < 24 ? 1 : 0.3);
        dust(handleOutline, [-14, 13, -49, -29], mobile ? 120 : 160, 0.42, () => 1);

        // Motes of light rise from the blooms and fade, like scent in the air.
        const moteRandom = stream(4040);
        const addMote = dotsFrom(moteRandom, { shimmer: 1, kind: MOTE });
        const moteColors = [[1, 0.72, 0.82], [1, 0.84, 0.62], [1, 0.42, 0.6]];
        for (let i = 0, count = mobile ? 70 : 110; i < count; i++) {
            const color = moteColors[i % moteColors.length];
            addMote((moteRandom() - 0.5) * 52, -6 + moteRandom() * 40, 4 + moteRandom() * 8,
                color, 1.5, 0.95, false, moteRandom());
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1));
        geometry.setAttribute('aShimmer', new THREE.Float32BufferAttribute(shimmers, 1));
        geometry.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 1));
        geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 }, uReveal: { value: 0 },
                uGather: { value: 0 }, uProjection: { value: 1 },
                uMotion: { value: 1 }
            },
            vertexShader: `
                attribute vec3 color;
                attribute float aSize;
                attribute float aOpacity;
                attribute float aShimmer;
                attribute float aKind;
                attribute float aPhase;
                uniform float uTime, uReveal, uGather, uProjection, uMotion;
                varying vec3 vColor;
                varying float vAlpha;
                void main() {
                    vec3 p = position;
                    float paper = 1.0 - step(0.5, abs(aKind - 1.0));
                    float rose = 1.0 - step(0.5, abs(aKind - 2.0));
                    float mote = 1.0 - step(0.5, abs(aKind - 3.0));
                    // Drift settles as the bouquet gathers into the flower.
                    float calm = uMotion * (1.0 - uGather);
                    float angle = position.x * 1.7 + position.y * 0.8;
                    float life = fract(uTime * 0.06 + aPhase);
                    p.y += mote * life * 18.0;
                    p.x += mote * sin(uTime * 0.8 + aPhase * 31.0) * 1.4;
                    float height = clamp((position.y + 49.0) / 98.0, 0.0, 1.0);
                    float localReveal = smoothstep(height * 0.32, height * 0.32 + 0.68, uReveal);
                    p *= 0.9 + localReveal * 0.1;
                    p.x += sin(uTime * 0.7 + p.y * 0.045) * height * 0.35 * calm;
                    // Paper billows most at its free edges, far from the knot.
                    float reach = clamp(length(position.xy - vec2(0.0, -29.0)) / 70.0, 0.0, 1.0);
                    float billow = sin(uTime * 0.9 + position.y * 0.11 + position.x * 0.07);
                    p += paper * reach * calm
                        * vec3(billow * 0.7, cos(uTime * 0.75 + position.x * 0.09) * 0.4, billow);
                    // Each rose nods on its own slow rhythm.
                    float nod = uTime * 0.85 + aPhase * 6.2832;
                    p.xy += rose * calm * vec2(sin(nod) * 0.4, cos(nod * 0.8) * 0.28);
                    // Every dot circles a little, so the whole picture breathes.
                    // Outlines skip this, or their vertices would jitter apart.
                    #ifndef OUTLINE
                    p.xy += calm * 0.09 * vec2(cos(uTime * 1.1 + angle * 3.7), sin(uTime * 1.3 + angle * 2.9));
                    #endif
                    vec3 seed = vec3(cos(angle), sin(angle), sin(angle * 1.3)) * 0.45;
                    p = mix(p, seed, uGather);
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    float modelScale = length(modelMatrix[0].xyz);
                    gl_PointSize = clamp(aSize * modelScale * uProjection / -mv.z, 1.0, 18.0);
                    gl_Position = projectionMatrix * mv;
                    vColor = color;
                    // Only the paper's faint wash shimmers; roses hold steady.
                    float twinkle = 1.0 - aShimmer * uMotion * 0.55
                        * (0.5 + 0.5 * sin(uTime * 1.6 + angle * 5.3));
                    float fade = mix(1.0, uMotion * smoothstep(0.0, 0.15, life)
                        * (1.0 - smoothstep(0.55, 1.0, life)), mote);
                    vAlpha = aOpacity * twinkle * fade * localReveal * (1.0 - smoothstep(0.78, 1.0, uGather));
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                void main() {
                    float radius = length(gl_PointCoord - 0.5);
                    if (radius > 0.5 || vAlpha < 0.01) discard;
                    // A crisp bead with a faint glow, rather than a soft blur.
                    float core = 1.0 - smoothstep(0.14, 0.26, radius);
                    float halo = (1.0 - smoothstep(0.0, 0.5, radius)) * 0.14;
                    vec3 highlight = mix(vColor, vec3(1.0), (1.0 - smoothstep(0.0, 0.1, radius)) * 0.16);
                    gl_FragColor = vec4(highlight, (core * 0.92 + halo) * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.points = new THREE.Points(geometry, this.material);
        this.points.frustumCulled = false;
        this.group.add(this.points);

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
        lineGeometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(lineOpacities, 1));
        lineGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(lineOpacities.map(() => 1), 1));
        lineGeometry.setAttribute('aShimmer', new THREE.Float32BufferAttribute(lineOpacities.map(() => 0), 1));
        // Paper outlines billow with the paper dots they describe.
        lineGeometry.setAttribute('aKind', new THREE.Float32BufferAttribute(lineOpacities.map(() => PAPER), 1));
        lineGeometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(lineOpacities.map(() => 0), 1));
        this.lineMaterial = new THREE.ShaderMaterial({
            // Shared uniforms keep paper lines attached through the reveal,
            // breeze and gather animation; they release with the point cloud.
            uniforms: this.material.uniforms,
            defines: { OUTLINE: 1 },
            vertexShader: this.material.vertexShader,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                void main() { gl_FragColor = vec4(vColor, vAlpha); }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        this.paperLines = new THREE.LineSegments(lineGeometry, this.lineMaterial);
        this.paperLines.frustumCulled = false;
        this.group.add(this.paperLines);
        this.pointCount = sizes.length;
    }

    update({ time, reveal, gather, projection, reducedMotion }) {
        const uniforms = this.material.uniforms;
        // `time` is wall-clock seconds, far too large for a float32 shader
        // uniform to resolve; count from the first frame instead.
        if (this.startTime === undefined) this.startTime = time;
        uniforms.uTime.value = time - this.startTime;
        uniforms.uReveal.value = reveal;
        uniforms.uGather.value = gather;
        uniforms.uProjection.value = projection;
        uniforms.uMotion.value = reducedMotion ? 0 : 1;
        this.group.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.4) * 0.055;
        this.group.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.65) * 0.012;
        // The whole bouquet floats a little, as if held in a gentle hand.
        const float = reducedMotion ? 0 : Math.sin(time * 0.9) * 0.6 * (1 - gather);
        this.points.position.y = this.paperLines.position.y = float;
    }

    dispose() {
        this.group.parent?.remove(this.group);
        this.points.geometry.dispose();
        this.material.dispose();
        this.paperLines.geometry.dispose();
        this.lineMaterial.dispose();
    }
}
