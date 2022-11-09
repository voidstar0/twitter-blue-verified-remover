function modify(obj, key, value) {
  for (var k in obj) {
    if (k === key) {
      obj[k] = value;
    }
    if (typeof obj[k] === "object") {
      modify(obj[k], key, value);
    }
  }
}

// monkey patch stolen from some answer in: https://stackoverflow.com/questions/60199655/overridding-xmlhttprequest-prototype-for-chrome-extension
var _open = XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function (method, URL) {
    var _onreadystatechange = this.onreadystatechange,
        _this = this;
    _this.onreadystatechange = function () {
        if (_this.readyState === 4 && _this.status === 200 && ~URL.indexOf('twitter.com/i/api')) {
            try {
                var data = JSON.parse(_this.responseText);
                modify(data, "is_blue_verified", false);
                modify(data, "ext_is_blue_verified", false);
                Object.defineProperty(_this, 'responseText', {value: JSON.stringify(data)});
            } catch (e) {}
        }
        if (_onreadystatechange) _onreadystatechange.apply(this, arguments);
    };

    Object.defineProperty(this, "onreadystatechange", {
        get: function () {
            return _onreadystatechange;
        },
        set: function (value) {
            _onreadystatechange = value;
        }
    });

    return _open.apply(_this, arguments);
};