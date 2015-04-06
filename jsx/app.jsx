var React = require('react');
var Reflux = require('reflux');


var imageActions = Reflux.createActions([
  'loadImage'
]);

var imageStore = Reflux.createStore({
  listenables: [imageActions],

  init: function() {
    this.image = '';
    this.exif = {};
    this.latitude = null;
    this.longtitude = null;
  },

  onLoadImage: function(file) {
    var self = this;

    // Read image file
    var reader = new FileReader();
    reader.onload = function() {
      self.image = reader.result;
      self.trigger({
        image: self.image,
        latitude: null,
        longtitude: null
      });
    };
    reader.readAsDataURL(file);

    // Get exif data from image
    EXIF.getData(file, function() {
      self.exif = this.exifdata;
      self.trigger({
        exif: self.exif
      });

      var gps = self.getGPSData(self.exif);
      if (gps && gps.latitude != null && gps.longtitude != null) {
        self.latitude = gps.latitude;
        self.longtitude = gps.longtitude;
        self.trigger({
          latitude: self.latitude,
          longtitude: self.longtitude
        });
      }
    });
  },

  getGPSData: function(exif) {
    if (exif['GPSLatitude'] == null ||
      exif['GPSLatitude'].length == null ||
      exif['GPSLatitude'].length !== 3) {
      return;
    }
    if (exif['GPSLongitude'] == null ||
      exif['GPSLongitude'].length == null ||
      exif['GPSLongitude'].length !== 3) {
      return;
    }

    var latitude = exif['GPSLatitude'][0] + exif['GPSLatitude'][1] / 60.0 + exif['GPSLatitude'][2] / 3600.0;
    if (exif['GPSLatitudeRef'] === 'S') {
      latitude *= -1;
    }
    var longtitude = exif['GPSLongitude'][0] + exif['GPSLongitude'][1] / 60.0 + exif['GPSLongitude'][2] / 3600.0;
    if (exif['GPSLongitudeRef'] === 'W') {
      longtitude *= -1;
    }

    return {
      latitude: latitude,
      longtitude: longtitude
    };
  }
});

var App = React.createClass({
  mixins: [Reflux.connect(imageStore), 'exif'],

  getInitialState: function() {
    return {
      image: '',
      exif: {},
      latitude: null,
      longtitude: null
    };
  },

  render: function() {
    return (
      <div className="container">
        <Header />
        <div className="row">
          <ImageArea image={this.state.image} />
        </div>
        <hr />
        <div className="row">
          <MapArea latitude={this.state.latitude} longtitude={this.state.longtitude} />
          <ExifArea exif={this.state.exif} />
        </div>
      </div>
    );
  }
});

var Header = React.createClass({
  render: function() {
    return (
      <div className="page-header">
        <h1>piccheck <small>画像データに埋め込まれているEXIFデータを確認できます。</small></h1>
      </div>
    );
  }
});

var ImageArea = React.createClass({
  propTypes: {
    image: React.PropTypes.string
  },

  onSelectFile: function(e) {
    if (e.target.files.length !== 1) {
      return;
    }

    var file = e.target.files[0];
    // check MIME type
    if (!/^image\/(png|jpeg|gif)$/.test(file.type)) {
      return;
    }

    imageActions.loadImage(file);
  },

  onDragOver: function(e) {
    e.preventDefault();
  },

  onDrop: function(e) {
    e.preventDefault();

    if (e.dataTransfer.files.length !== 1) {
      return;
    }

    var file = e.dataTransfer.files[0];
    // check MIME type
    if (!/^image\/(png|jpeg|gif)$/.test(file.type)) {
      return;
    }

    imageActions.loadImage(file);
  },

  render: function() {
    var img;
    if (this.props.image.length > 0) {
      img = (
        <img src={this.props.image} className="picture" onDragOver={this.onDragOver} onDrop={this.onDrop} />
      );
    } else {
      img = (
        <img src="./image/noimage.png" className="picture" onDragOver={this.onDragOver} onDrop={this.onDrop} />
      );
    }
    return (
      <div className="col-sm-12">
        <h2>画像ファイル</h2>
        {img}
        <input type="file" name="imageFile" onChange={this.onSelectFile} />
      </div>
    );
  }
});

var ExifArea = React.createClass({
  propTypes: {
    exif: React.PropTypes.object
  },

  render: function() {
    var rows = [];
    for (var name in this.props.exif) {
      if (name !== 'undefined') {
        rows.push(<ExifRow key={name} name={name} value={this.props.exif[name] + ''} />);
      }
    }
    return (
      <div className="col-sm-6">
        <h2>EXIFデータ</h2>
        <table className="table table-bordered table-condensed">
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    );
  }
});

var ExifRow = React.createClass({
  propTypes: {
    name: React.PropTypes.string,
    value: React.PropTypes.string
  },

  render: function() {
    return (
      <tr>
        <td>{this.props.name}</td>
        <td>{this.props.value}</td>
      </tr>
    );
  }
});

var MapArea = React.createClass({
  propTypes: {
    latitude: React.PropTypes.number,
    longtitude: React.PropTypes.number
  },

  componentDidUpdate: function() {
    if (this.refs.map == null) {
      return;
    }

    // Get HTML node for mapping
    var mapNode = this.refs.map.getDOMNode();

    // Call google map API
    var latlng = new google.maps.LatLng(this.props.latitude, this.props.longtitude);
    var mapOptions = {
        zoom: 8,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        draggable: false
    };
    var map = new google.maps.Map(mapNode, mapOptions);
    var marker = new google.maps.Marker({
        position: latlng,
        map: map
    });
  },

  render: function() {
    if (this.props.latitude == null ||
      this.props.longtitude == null) {
      return (
        <div className="col-sm-6">
          <h2>マップ</h2>
          <img src="./image/nomap.png" className="nomap" />
          <p>*GPSデータが検出されると地図が表示されます</p>
        </div>
      );
    }

    return (
      <div className="col-sm-6">
        <h2>マップ</h2>
        <div className="map" ref="map"></div>
        <p>緯度: {this.props.latitude}</p>
        <p>経度: {this.props.longtitude}</p>
      </div>
    );
  }
});

React.render(<App />, document.getElementById('app'));
