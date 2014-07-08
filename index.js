var postcss  = require('postcss');
var document = require("dom-lite").document;

// ClipPath object
function ClipPath (opts) {

	var _this = this;

	opts = opts || {};
	this.options = {
		id: 'clipPath',
		lint: true
	};
	this.postcss = this.postcss.bind(this);

	this.helpers = {

		units: function (value) {
			var unit = 'X';

			if (value.indexOf('px') !== -1) {
				value = value.replace('px', '');
				unit = 'px';
			} else if (value.indexOf('%') !== -1) {
				value = value.replace('%', '');
				unit = '%';
			}

			return [Number(value), unit];
		}

	}

	this.clipPaths = {

		polygon: function (points) {

			var properties = {};

			// CSS
			properties.masksCSS = ['polygon(' + points + ')'];

			// Get the points
			points = points.split(',');
			points = points.map(function (point) {

				point = point.trim().replace(/\s+/g, ' ');
				var values = point.split(' ');

				return [_this.helpers.units(values[0]),_this.helpers.units(values[1])];

			});

			var uniqueUnit = false,
				uniqueUnitValue,
				add = true;
			// get unit
			for (var i = 0; i < points.length; i++) {
				for (var j in points[i]) {
					if (points[i][j][1] !== 'X') {
						uniqueUnitValue = points[i][j][1];
						break;
					}
				}
			}
			// check if all units are identical
			for (var i = 0; i < points.length; i++) {
				for (var j in points[i]) {
					if (points[i][j][1] !== 'X' && points[i][j][1] !== uniqueUnitValue) {
						add = false;
						break;
					}
				}
			}

			if (add) {

				properties.attributes = {};

				// if unit is %, add an attribute and /100
				if (uniqueUnitValue === '%') {
					points = points.map(function (point) {
						point[0][0] /= 100;
						point[1][0] /= 100;
						return point;
					});

					properties.attributes.clipPathUnits = 'objectBoundingBox';
				}

				points = points.map(function (point) {
					point = point[0][0] + ' ' + point[1][0];
					return point;
				});

				var polygon = document.createElement('polygon');
					polygon.setAttribute('points', points.join(' '));
				properties.masksSVG = [polygon];
			}

			return properties;
		}
	}

}

ClipPath.prototype.convert = function (value) {

	var fmatch,
		points,
		properties;

	// Polygon
	fmatch = value.match(/(polygon)\(\s*([a-z0-9\,\.\s\%]+)\s*\)/i);
	if (fmatch !== null) {
		points = fmatch[2];
		properties = this.clipPaths.polygon(points);
	}

	return properties;

};

ClipPath.prototype.postcss = function (css) {

	var _this = this;

	css.eachRule(function (rule) {

		rule.eachDecl(function (decl, idx) {

			// find clip-path declaration
			if (decl.prop === 'clip-path') {

				var value = decl.value;
				var currentProperties = _this.convert(value);
				var properties = {
					masksCSS: currentProperties.masksCSS || [],
					masksSVG: currentProperties.masksSVG || [],
					attributes: currentProperties.attributes || {}
				};

				if (properties.masksSVG.length > 0) {
					// new <svg> element
					var svg = document.createElement('svg');
						svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
					// new <clippath> element
					var clipPath = document.createElement('clippath');
						clipPath.id = _this.options.id;
						// add attributes
						for (var attribute in properties.attributes) {
							clipPath.setAttribute(attribute, properties.attributes[attribute]);
						}
						// append shape to <clippath>
						clipPath.appendChild(properties.masksSVG);
						// append <clippath> to <svg>
						svg.appendChild(clipPath);

					var valueDataURI = 'url(\'data:image/svg+xml;charset=utf-8,' + svg.toString() + '#' + _this.options.id + '\')';

					// insert SVG masks, only if it's not already present
					var newDecl = { prop: 'clip-path', value: valueDataURI};
					var add = true;
					rule.eachDecl(function (d) {
						if (newDecl.value === d.value) {
							add = false;
							return false;
						}
					});
					if (add) {
						rule.insertBefore(decl, newDecl);
					}
				}

			}

		});

	});

};

ClipPath.prototype.process = function (css) {
	return postcss().use(this.postcss).process(css).css;
};

var clipPath = function (options) {
	return new ClipPath(options);
};
clipPath.process = function (css, options) {
	return new ClipPath(options).process(css);
};

module.exports = clipPath;