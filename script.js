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

function notActuallyVerifiedIds(users) {
  if (!users) {
    return [];
  }
  const notVerifiedIds = [];
  for (const [key, value] of Object.entries(users)) {
    if (
      (value.ext_is_blue_verified || value.is_blue_verified) &&
      !value.verified
    ) {
      notVerifiedIds.push(key);
    }
  }
  return notVerifiedIds;
}

// monkey patch stolen from some answer in: https://stackoverflow.com/questions/60199655/overridding-xmlhttprequest-prototype-for-chrome-extension
var _open = XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function (method, URL) {
  var _onreadystatechange = this.onreadystatechange,
    _this = this;
  _this.onreadystatechange = function () {
    if (
      _this.readyState === 4 &&
      _this.status === 200 &&
      ~URL.indexOf("twitter.com/i/api")
    ) {
      var data = JSON.parse(_this.responseText);
      if (URL.includes("notifications/verified.json")) {
        const notVerifiedIds = notActuallyVerifiedIds(
          data?.globalObjects?.users
        );
        if (notVerifiedIds.length > 0 && data?.globalObjects?.tweets) {
          for (const [tweetId, tweetObj] of Object.entries(data?.globalObjects?.tweets)) {
            if (notVerifiedIds.includes(tweetObj?.user_id_str)) {
              delete data?.globalObjects?.tweets[tweetId];
            } 
          }
        }
        if (notVerifiedIds.length > 0 && data?.globalObjects?.notifications) {
          for (const [notificationId, notificationValue] of Object.entries(
            data?.globalObjects?.notifications
          )) {
            if (
              notificationValue?.message?.entities?.every((entry) =>
                notVerifiedIds.includes(entry?.ref?.user?.id)
              )
            ) {
              delete data?.globalObjects?.notifications[notificationId];
            } else if (
              notificationValue?.message?.entities?.some((entry) =>
                notVerifiedIds.includes(entry?.ref?.user?.id)
              )
            ) {
              notificationValue.message.entities =
                notificationValue.message.entities.filter(
                  (entry) => !notVerifiedIds.includes(entry?.ref?.user?.id)
                );
              notificationValue.template.aggregateUserActionsV1.fromUsers =
                notificationValue.template.aggregateUserActionsV1.fromUsers.filter(
                  (entry) => !notVerifiedIds.includes(entry?.user?.id)
                );
            }
          }
          Object.defineProperty(_this, "responseText", {
            value: JSON.stringify(data),
          });
        }
      } else {
        try {
          modify(data, "is_blue_verified", false);
          modify(data, "ext_is_blue_verified", false);
          Object.defineProperty(_this, "responseText", {
            value: JSON.stringify(data),
          });
        } catch (e) {}
      }
    }
    if (_onreadystatechange) _onreadystatechange.apply(this, arguments);
  };

  Object.defineProperty(this, "onreadystatechange", {
    get: function () {
      return _onreadystatechange;
    },
    set: function (value) {
      _onreadystatechange = value;
    },
  });

  return _open.apply(_this, arguments);
};
