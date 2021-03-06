class MapPlot {
	makeColorbar(svg, color_scale, top_left, colorbar_size, scaleClass=d3.scaleLinear) {
		// Affichage color bar
		const value_to_svg = scaleClass()
			.domain(color_scale.domain())
			.range([colorbar_size[1], 0]);

		const range01_to_color = d3.scaleLinear()
			.domain([0, 1])
			.range(color_scale.range())
			.interpolate(color_scale.interpolate());

		// Axis numbers
		const colorbar_axis = d3.axisLeft(value_to_svg)
			.tickFormat(d3.format(".0f"))

		const colorbar_g = this.svg.append("g")
			.attr("id", "colorbar")
			.attr("transform", "translate(" + top_left[0] + ', ' + top_left[1] + ")")
			.call(colorbar_axis);

		// Create the gradient
		function range01(steps) {
			return Array.from(Array(steps), (elem, index) => index / (steps-1));
		}

		const svg_defs = this.svg.append("defs");

		const gradient = svg_defs.append('linearGradient')
			.attr('id', 'colorbar-gradient')
			.attr('x1', '0%') // bottom
			.attr('y1', '100%')
			.attr('x2', '0%') // to top
			.attr('y2', '0%')
			.attr('spreadMethod', 'pad');

		gradient.selectAll('stop')
			.data(range01(10))
			.enter()
			.append('stop')
				.attr('offset', d => Math.round(100*d) + '%')
				.attr('stop-color', d => range01_to_color(d))
				.attr('stop-opacity', 1);

		// create the colorful rect
		colorbar_g.append('rect')
			.attr('id', 'colorbar-area')
			.attr('width', colorbar_size[0])
			.attr('height', colorbar_size[1])
			.style('fill', 'url(#colorbar-gradient)')
			.style('stroke', 'black')
			.style('stroke-width', '1px')
	}
	constructor(svg_element_id) {
		this.svg = d3.select('#' + svg_element_id);
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;
		const projection = d3.geoMercator()
			.rotate([0, 0])
			.center([8.3, 46.8]) // WorldSpace: Latitude and longitude of center of switzerland
			.scale(180)
			.translate([this.svg_width / 2, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator = d3.geoPath()
			.projection(projection);

		//colormap for number of working hours
		const color_scale = d3.scaleLog()
			.range(["hsl(60,100%,92%)", "hsl(0,100%,50%)"])
			.interpolate(d3.interpolateHcl);

		const population_promise = d3.csv("Milestone3/data/map-csv.csv").then((data) => {
			let countryId_to_hours = {};
			data.forEach((row) => {
				
				countryId_to_hours[row.LOCATION] =  parseFloat(row.Value);
			});

			return countryId_to_hours;
		});

		const map_promise = d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((topojson_raw) => {
			console.log(topojson_raw.objects.countries)
			const country_paths = topojson.feature(topojson_raw, topojson_raw.objects.countries);
			return country_paths.features;
		});
            
		Promise.all([population_promise, map_promise]).then((results) => {
	        let countryId_to_hours = results[0];
			let map_data = results[1];			

			map_data.forEach(country => {
				country.properties.hours_worked = countryId_to_hours[country.properties.name];
			});

			const densities = Object.values(countryId_to_hours);
			color_scale.domain([d3.quantile(densities, .01), d3.quantile(densities, .99)]);
			color_scale.domain([d3.min(densities), d3.max(densities)]);

			// Order of creating groups decides what is on top
			this.map_container = this.svg.append('g');
			this.point_container = this.svg.append('g');
			this.label_container = this.svg.append('g');

			this.makeColorbar(this.svg, color_scale, [-120, 30], [20, this.svg_height - 2*30]);	

			//color the map according to the average number of working hours per capita of each country
			this.map_container.selectAll(".country")
				.data(map_data)
				.enter()
				.append("path")
				.classed("country", true)
				.attr("d", path_generator)
				.style("fill", (d) => d.properties.hours_worked ? color_scale(d.properties.hours_worked): "rgb(244, 244, 244)")
				.on("mouseover", function(d, i) {
					d3.select(this + d.properties.name).style("display", "block");
				})
				.on("mouseout", function(d, i) {
					d3.select(this + d.properties.name).style("display", "none");
				});

			this.label_container.selectAll(".country-label")
				.data(map_data)
				.enter().append("text")
				.classed("country-label", true)
				.attr("d", path_generator)
				.attr("transform", (d) => "translate(" + path_generator.centroid(d) + ")")
				.attr("dy", ".35em")
				.on("mouseover", function(d, i) {
					d3.select(this).style("display", "block");
				})
				.on("mouseout", function(d, i) {
					d3.select(this).style("display", "none");
				})
				;
			const r = 3;
			this.makeColorbar(this.svg, color_scale, [-120, 30], [20, this.svg_height - 2*30]);
		});
	}
}

function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

whenDocumentLoaded(() => {
	plot_object = new MapPlot('map1');
});


