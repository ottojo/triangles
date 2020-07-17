var inputImage = new Path.Circle(new Point(0, 0), 0);

var triangleGroup = new Group();
var debugGroup = new Group;

function onMouseDrag(event) {
    inputImage.position = event.point;
}

function onMouseUp(event) {
    recalcTriangles(generatePoints(inputImage));
}

function pointsOf(item) {
    foundPoints = [];

    if (typeof item.children !== "undefined") {
        for (var i = 0; i < item.children.length; i++) {
            var childrenPoints = pointsOf(item.children[i]);
            if (childrenPoints.length > 0) {
                return childrenPoints;
            }
        }
    }

    if (typeof item.name !== "undefined" && item.name == "BORDER") {
        console.log("Found BORDER:", item);
        for (var i = 0; i < item.segments.length; i++) {
            console.log("Adding Border Point", i, item.segments[i].point);
            foundPoints.push([item.segments[i].point.x, item.segments[i].point.y]);
        }
        return foundPoints;
    }

    return [];
}

function generatePoints(image) {
    var points = [[0, 0], [0, view.size.height - 1], [view.size.width - 1, 0], [view.size.width, view.size.height]];

    for (var x = 0; x < view.size.width; x += 100) {
        for (var y = 0; y < view.size.height; y += 100) {
            var x_d = Math.floor(Math.random() * 70);
            var y_d = Math.floor(Math.random() * 70);

            if (!image.contains(new Point(x + x_d, y + y_d))) {
                points.push([x + x_d, y + y_d]);
            }
        }
    }

    var imagePoints = pointsOf(image);
    console.log("Image Points:");
    console.log(imagePoints);


    Array.prototype.push.apply(points, imagePoints);
    return points;
}

function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }


function forEachTriangleEdge(points, delaunay, callback) {
    for (var e = 0; e < delaunay.triangles.length; e++) {
        if (e > delaunay.halfedges[e]) {
            var p = points[delaunay.triangles[e]];
            var q = points[delaunay.triangles[nextHalfedge(e)]];
            callback(e, p, q);
        }
    }
}

function annotate(X, text) {
    var textA = new PointText(X);
    textA.justification = 'center';
    textA.fillColor = 'red';
    textA.content = text;
}

/**
 * @param {Point} A Point A, this will be offset
 * @param {Point} B Point B
 * @param {Point} C Point C
 * @param {length} X offset size
 */
function offsetPoint(A, B, C, X) {
    var AB = B - A;
    var AC = C - A;
    var BC = C - B;

    var a = BC.length;
    var b = AC.length;
    var c = AB.length;

    var alpha = Math.acos(-(a * a - b * b - c * c) / (2 * b * c));

    var x = X / Math.sin(alpha);

    var Anew = A + AB.normalize(x) + AC.normalize(x);

    return Anew
}

function offsetTri(tri, X) {
    var A = new Point(tri[0]);
    var B = new Point(tri[1]);
    var C = new Point(tri[2]);

    var An = offsetPoint(A, B, C, X);
    var Bn = offsetPoint(B, C, A, X);
    var Cn = offsetPoint(C, A, B, X);

    return [An, Bn, Cn];
}

function recalcTriangles(points) {

    delaunay = Delaunator.from(points);

    triangleGroup.removeChildren();
    forEachTriangle(points, delaunay, function (t, tri) {
        var offsetTrianglePoints = offsetTri(tri, 2.5);

        var innerTri = new Path();
        var outerTri = new Path(tri);
        outerTri.closed = true;

        for (var i = 0; i < offsetTrianglePoints.length; i++) {

            if (!outerTri.contains(offsetTrianglePoints[i])) {
                console.log("Skipping Tri because it is too small for offset:", outerTri);
                return;
            }
            innerTri.add(offsetTrianglePoints[i]);
        }

        if (innerTri.intersects(inputImage)) {
            innerTri.fillColor = 'red';
        } else {
            innerTri.fillColor = '#f96900ff';
        }

        triangleGroup.addChild(innerTri);
    });



    debugGroup.removeChildren();
    if (globals.debug == true) {

        var bounds = new Path.Rectangle(inputImage.bounds);
        bounds.strokeColor = 'pink';
        debugGroup.addChild(bounds);


        for (var i = 0; i < points.length; i++) {
            var c = new Path.Circle(points[i], 3);
            c.fillColor = 'green';
            debugGroup.addChild(c);
        }



        forEachTriangleEdge(points, delaunay, function (e, p, q) {
            var line = Path.Line(p, q);
            line.strokeColor = 'black';
            line.opacity = 0.5;
            debugGroup.addChild(line);
        });
    }
}

globals.drawPaperImage = function (svgData) {
    inputImage = project.importSVG(svgData);
    console.log("Read input image:", inputImage);
}

function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }

function pointsOfTriangle(delaunay, t) {
    return edgesOfTriangle(t).map(function (e) {
        return delaunay.triangles[e];
    });
}

function forEachTriangle(points, delaunay, callback) {
    for (var t = 0; t < delaunay.triangles.length / 3; t++) {
        callback(t, pointsOfTriangle(delaunay, t).map(function (p) {
            return points[p];
        }));
    }
}