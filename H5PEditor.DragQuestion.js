var H5PEditor = H5PEditor || {};

/**
 * Interactive Video editor widget module
 *
 * @param {jQuery} $
 */
H5PEditor.widgets.dragQuestion = H5PEditor.DragQuestion = (function ($) {
  /**
   * Initialize interactive video editor.
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   * @returns {_L8.C}
   */
  function C(parent, field, params, setValue) {
    var that = this;

    // Set params
    if (params === undefined) {
      this.params = {
        elements: [],
        dropZones: []
      };
      setValue(field, this.params);
    }
    else {
      this.params = params;
    }

    // Get updates for fields
    H5PEditor.followField(parent, 'background', function (params) {
      that.setBackground(params);
    });
    H5PEditor.followField(parent, 'size', function (params) {
      that.setSize(params);
    });

    this.parent = parent;
    this.field = field;

    this.passReadies = true;
    parent.ready(function () {
      that.passReadies = false;
    });
  };

  /**
   * Append field to wrapper.
   *
   * @param {type} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    this.$item = $(this.createHtml()).appendTo($wrapper);
    this.$editor = this.$item.children('.h5peditor-dragquestion');
    this.$dnbWrapper = this.$item.children('.h5peditor-dragnbar');
    this.$errors = this.$item.children('.errors');

    this.fontSize = parseInt(this.$editor.css('fontSize'));
  };

  /**
   * Create HTML for the field.
   *
   * @returns {@exp;H5PEditor@call;createItem}
   */
  C.prototype.createHtml = function () {
    return H5PEditor.createItem(this.field.widget, '<span class="h5peditor-label">' + this.field.label + '</span><div class="h5peditor-dragnbar"></div><div class="h5peditor-dragquestion">Please specify task size first.</div>');
  };

  /**
   * Set current background.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setBackground = function (params) {
    var path = params === undefined ? '' : params.path;
    if (path !== '') {
      path = H5PEditor.filesPath + (params.tmp !== undefined && params.tmp ? '/h5peditor/' : '/h5p/content/' + H5PEditor.contentId + '/') + path;
    }

    this.$editor.css({
      backgroundImage: 'url(' + path + ')'
    });
  };

  /**
   * Set current dimensions.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setSize = function (params) {
    if (params === undefined) {
      return;
    }

    var width = this.$editor.width();
    this.$editor.css({
      height: width * (params.height / params.width),
      fontSize: this.fontSize * (width / params.width)
    });

    // TODO: Should we care about resize events? Will only be an issue for responsive designs.

    if (this.dnb === undefined) {
      this.initializeEditor();
    }

    // TODO: Move elements that is outside inside.
  };

  /**
   * Initialize DragNBar and add elements.
   *
   * @returns {undefined}
   */
  C.prototype.initializeEditor = function () {
    var that = this;
    this.$editor.html('').addClass('h5p-ready');

    this.dnb = new H5P.DragNBar(this.getButtons(), this.$editor);

    this.dnb.stopMovingCallback = function (x, y) {
      // Update params when the element is dropped.
      var params = that.params.elements[that.dnb.dnd.$element.data('id')];
      params.x = x;
      params.y = y;
    };

    this.dnb.dnd.releaseCallback = function () {
      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        that.dnb.dnd.$element.dblclick();
      }
    };
    this.dnb.attach(this.$dnbWrapper);


    // Add Elements
    for (var i = 0; i < this.params.elements.length; i++) {
      this.insertElement(i);
    }

    // Add Drop Zones
  };

  /**
   * Generate a list of buttons for DnB.
   *
   * @returns {Array} Buttons
   */
  C.prototype.getButtons = function () {
    var options = this.field.fields[0].field.fields[0].options;

    var buttons = [];
    for (var i = 0; i < options.length; i++) {
      buttons.push(this.getButton(options[i]));
    }

    return buttons;
  };

  /**
   *
   * @param {type} library
   * @returns {undefined}
   */
  C.prototype.getButton = function (library) {
    var that = this;
    var id = library.split(' ')[0].split('.')[1].toLowerCase();

    return {
      id: id,
      title: C.t('insertElement', {':type': id}),
      createElement: function () {
        that.params.elements.push({
          type: {
            library: library,
            params: {}
          },
          x: 0,
          y: 0,
          width: 15,
          height: 10,
          dropZones: []
        });

        return that.insertElement(that.params.elements.length - 1);
      }
    };
  };

  /**
   * Insert element at given params index.
   *
   * @param {int} index
   * @returns {undefined}
   */
  C.prototype.insertElement = function (index) {
    var that = this;
    var element = this.params.elements[index];

    var $element = $('<div class="h5p-dq-element" style="width:' + element.width + '%;height:' + element.height + '%;top:' + element.y + '%;left:' + element.x + '%">' + index + '</div>').appendTo(this.$editor).data('id', index).mousedown(function (event) {
      that.dnb.dnd.press($element, event.pageX, event.pageY);
      return false;
    }).dblclick(function () {
      // Edit
      console.log('Editing', element);
    });

    var instance = new (H5P.classFromName(element.type.library.split(' ')[0]))(element.type.params);
    instance.attach($element);

    return $element;
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
   * Translate UI texts for this library.
   *
   * @param {String} key
   * @param {Object} vars
   * @returns {@exp;H5PEditor@call;t}
   */
  C.t = function (key, vars) {
    return H5PEditor.t('H5PEditor.DragQuestion', key, vars);
  };

  return C;
})(H5P.jQuery);

// Default english translations
H5PEditor.language['H5PEditor.DragQuestion'] = {
  libraryStrings: {
    insertElement: 'Insert :type'
  }
};