/* Ten particle roses in folded paper: sparse dots give the paper its own
   texture, while thin continuous curves describe its rolled edges and folds. */
class ParticleBouquet {
    constructor({ mobile = false } = {}) {
        this.group = new THREE.Group();
        const positions = [], colors = [], sizes = [], opacities = [];
        const linePositions = [], lineColors = [], lineOpacities = [];
        let seed = 2010;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
        const add = (x, y, z, color, size = 1.25, opacity = 0.85) => {
            positions.push(x, y, z);
            colors.push(...color);
            sizes.push(size * (0.7 + random() * 0.65));
            opacities.push(opacity * (0.72 + random() * 0.28));
        };
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
        const paper = (origin, left, right, tint, fold = 0, lip = null) => {
            surface(80, 115, (u, v) => {
                const top = lip ? cubic(lip, u) : mix(left, right, u);
                if (!lip) top[1] += Math.sin(u * Math.PI) * 0.6;
                const p = mix(origin, top, Math.sqrt(v));
                const crease = Math.abs(u - 0.52);
                p[2] += Math.sin(u * Math.PI * 2 + fold) * v * 1.8;
                const shade = 0.76 + 0.2 * u + crease * 0.1;
                const edge = v > 0.975 ? [1, 0.88, 0.86] : tint.map(c => c * shade);
                add(...p, edge, 1.15, 0.46);
            }, 0.95);
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
                    : [0.15 * light, 0.68 * light, 0.18 * light], 1.45, 0.85);
            });
            // Dotted edges make each leaf legible even with very little fill.
            [-1, 1].forEach(side => path(12, v => {
                const across = side * Math.sin(v * Math.PI) * length * width;
                const along = v * length;
                add(x + Math.sin(angle) * along + Math.cos(angle) * across,
                    y + Math.cos(angle) * along - Math.sin(angle) * across,
                    z + Math.sin(v * Math.PI) * 1.1 - Math.abs(across) * 0.17,
                    [0.14, 0.78, 0.22], 1.4, 0.85);
            }));
        };
        const blooms = [
            [-12, 26, -2, 5.7], [1, 28, -3, 5.9], [14, 24, -1, 5.7],
            [-20, 13, 2, 5.8], [-7, 14, 6, 6.1], [7, 14, 7, 6.2], [21, 11, 2, 5.5],
            [-13, 0, 7, 6.0], [1, -2, 11, 6.4], [15, -2, 7, 5.9]
        ];
        this.bloomCount = blooms.length;
        blooms.forEach(([x, y, z], index) => {
            path(25, v => {
                add(x * v + Math.sin(v * Math.PI) * 0.45, -29 + (y + 29) * v,
                    -2 + (z + 2) * v, [0.12, 0.82, 0.18], 1.4, 0.8);
            });
            leaf(x * 0.85, y - 3, z - 3, 8 + random() * 4,
                Math.sign(x || 1) * (0.7 + random() * 0.9));
            if (index < 7) leaf(x, y, z - 4, 7, -0.6 + random() * 1.2);
        });
        [[-24, 11, -1, 12, -0.3], [-16, 25, -5, 12, -0.4],
            [19, 21, -4, 13, 0.3], [25, 3, 0, 10, 0.6],
            [-20, -2, 0, 9, -0.65], [15, -15, 1, 9, 1.1]]
            .forEach(args => leaf(...args));

        // Loose samples follow the petal curls, leaving space between points
        // instead of joining into a solid, model-like rose.
        blooms.forEach(([cx, cy, cz, baseRadius], bloomIndex) => {
            const radius = baseRadius * 1.18;
            const phase = random() * Math.PI * 2;
            for (let layer = 0; layer < 5; layer++) {
                const t = layer / 4;
                const petals = 4 + layer;
                for (let petal = 0; petal < petals; petal++) {
                    const angle = petal / petals * Math.PI * 2 + phase + layer * 0.64;
                    surface(18, 15, (u, v) => {
                        const across = u * 2 - 1;
                        const petalAngle = angle + across * Math.PI / petals * (0.58 + v * 0.64);
                        const r = radius * (0.07 + t * 0.53 + v * (0.15 + t * 0.23))
                            * (1 - across * across * 0.17);
                        const curl = Math.pow(Math.abs(across), 2) * 0.14;
                        const z = radius * (0.78 - t * 0.62 + Math.sin(v * Math.PI) * 0.18
                            - v * 0.18 + curl + Math.pow(v, 6) * 0.13);
                        const light = 0.54 + 0.39 * Math.pow(v, 0.65)
                            + 0.055 * Math.sin(petalAngle + 0.8);
                        const rim = Math.pow(v, 7) * 0.07;
                        const tint = bloomIndex % 3 === 0 ? [1, 0.14, 0.31] : [0.96, 0.055, 0.21];
                        const color = tint.map((c, i) => Math.min(1, c * light + rim
                            + (i === 0 ? 0.09 : 0)));
                        add(cx + Math.cos(petalAngle) * r,
                            cy + Math.sin(petalAngle) * r * 0.93,
                            cz + z, color, 2.05, 1.0);
                    }, 1.5);
                }
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
            add(Math.cos(angle) * (r + fold), -29 - v * 20,
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

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1));
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
                uniform float uTime, uReveal, uGather, uProjection, uMotion;
                varying vec3 vColor;
                varying float vAlpha;
                void main() {
                    vec3 p = position;
                    float height = clamp((p.y + 49.0) / 98.0, 0.0, 1.0);
                    float localReveal = smoothstep(height * 0.32, height * 0.32 + 0.68, uReveal);
                    p *= 0.9 + localReveal * 0.1;
                    p.x += sin(uTime * 0.7 + p.y * 0.045) * height * 0.22 * uMotion;
                    float angle = position.x * 1.7 + position.y * 0.8;
                    vec3 seed = vec3(cos(angle), sin(angle), sin(angle * 1.3)) * 0.45;
                    p = mix(p, seed, uGather);
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    float modelScale = length(modelMatrix[0].xyz);
                    gl_PointSize = clamp(aSize * modelScale * uProjection / -mv.z, 1.0, 18.0);
                    gl_Position = projectionMatrix * mv;
                    vColor = color;
                    vAlpha = aOpacity * localReveal * (1.0 - smoothstep(0.78, 1.0, uGather));
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                void main() {
                    float radius = length(gl_PointCoord - 0.5);
                    if (radius > 0.5 || vAlpha < 0.01) discard;
                    float core = exp(-radius * radius * 32.0);
                    float halo = exp(-radius * radius * 10.0) * 0.18;
                    vec3 highlight = mix(vColor, vec3(1.0), exp(-radius * radius * 140.0) * 0.1);
                    gl_FragColor = vec4(highlight, (core * 0.85 + halo) * vAlpha);
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
        this.lineMaterial = new THREE.ShaderMaterial({
            // Shared uniforms keep paper lines attached through the reveal,
            // breeze and gather animation; they release with the point cloud.
            uniforms: this.material.uniforms,
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
        uniforms.uTime.value = time;
        uniforms.uReveal.value = reveal;
        uniforms.uGather.value = gather;
        uniforms.uProjection.value = projection;
        uniforms.uMotion.value = reducedMotion ? 0 : 1;
        this.group.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.4) * 0.055;
        this.group.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.65) * 0.012;
    }

    dispose() {
        this.group.parent?.remove(this.group);
        this.points.geometry.dispose();
        this.material.dispose();
        this.paperLines.geometry.dispose();
        this.lineMaterial.dispose();
    }
}
