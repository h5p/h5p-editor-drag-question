var H5PEditor = H5PEditor || {};

/**
 * Editor widget module for dynamic value checkboxes.
 *
 * Displays a list of checkboxes, and the list is regenerated each time the field is set as active
 * unlike H5PEditor.select where the options are generated when the field is initialized, and afther that stays the same.
 *
 * Other fields may change the options in dynamicCheckboxes
 */
H5PEditor.widgets.dynamicCheckboxes = H5PEditor.DynamicCheckboxes = (function ($) {
  /**
   * Initialize widget.
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   * @returns {_L8.C}
   */
  function C(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;

    if (params === undefined) {
      this.params = [];
      setValue(field, this.params);
    }
    else {
      this.params = params;
    }
  };

  /**
   * Append widget to from.
   *
   * @param {jQuery} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    this.$item = $(H5PEditor.createItem(this.field.widget, '')).appendTo($wrapper);
    this.$errors = this.$item.children('.errors');
  };

  /**
   * The widget is set as active.
   * (re)Generate options.
   *
   * @returns {undefined}
   */
  C.prototype.setActive = function () {
    var that = this;
    var html = '';

    for (var i = 0; i < this.field.options.length; i++) {
      var option = this.field.options[i];
      var selected = false;

      // Check if selected
      for (var j = 0; j < this.params.length; j++) {
        if (this.params[j] === option.value) {
          selected = true;
          break;
        }
      }

      html += '<li><label class="h5p-editor-label"><input type="checkbox" value="' + option.value + '"' + (selected ? ' checked="checked"' : '') + '/>' + option.label + '</label></li>';
    }

    this.$item.html(html ? '<div class="h5peditor-label">' + this.field.label + '</div><ul class="h5peditor-dynamiccheckboxes-select">' + html + '</ul>' : '');

    this.$item.find('input').change(function () {
      that.change($(this));
    });
  };

  /**
   * Update params with changes to checkbox.
   *
   * @param {type} $checkbox
   * @returns {undefined}
   */
  C.prototype.change = function ($checkbox) {
    var value = $checkbox.val();
    if ($checkbox.is(':checked')) {
      this.params.push(value);
    }
    else {
      for (var i = 0; i < this.params.length; i++) {
        if (this.params[i] === value) {
          this.params.splice(i, 1);
        }
      }
    }
  };

  /**
   * Validate the current field.
   *
   * @returns {Boolean}
   */
  C.prototype.validate = function () {
    return true;
  };

  /**
   *
   * @returns {undefined}
   */
  C.prototype.remove = function () {
    this.$item.remove();
  };

  return C;
})(H5P.jQuery);