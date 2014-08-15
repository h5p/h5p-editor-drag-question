var H5PEditor = H5PEditor || {};

/**
 * Interactive Video editor widget module
 * TODO: Rewrite to use H5P.DragQuestion for previewing?
 
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
    H5PEditor.followField(parent, 'settings/background', function (params) {
      that.setBackground(params);
    });
    H5PEditor.followField(parent, 'settings/size', function (params) {
      that.setSize(params);
    });

    // Get options from semantics, clone since we'll be changing values.
    this.elementFields = H5P.cloneObject(field.fields[0].field.fields, true);
    this.dropZoneFields = H5P.cloneObject(field.fields[1].field.fields, true);
    this.elementLibraryOptions = this.elementFields[0].options;
    this.elementDropZoneFieldWeight = 5;
    this.elementFields[this.elementDropZoneFieldWeight].options = [];
    this.dropZoneElementFieldWeight = 6;
    this.elementOptions = [];

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
   * @param {jQuery} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    var that = this;

    this.$item = $(this.createHtml()).appendTo($wrapper);
    this.$editor = this.$item.children('.h5peditor-dragquestion');
    this.$dnbWrapper = this.$item.children('.h5peditor-dragnbar');
    this.$dialog = this.$item.children('.h5peditor-fluid-dialog');
    this.$dialogInner = this.$dialog.children('.h5peditor-fd-inner');
    this.$errors = this.$item.children('.h5p-errors');

    // Handle click events for dialog buttons.
    this.$dialog.find('.h5peditor-done').click(function () {
      if (that.doneCallback() !== false) {
        that.hideDialog();
        
        setTimeout(function () {
        for (var i = 0; i < that.dropZones.length; i++) {
          if (!that.dropZones[i].$dropZone.is(':visible')) {
            // Remove him!
            that.removeDropZone(i);
            i--;
          }
        }
        }, 1);
        

        // TODO: What to do when DZ are removed through dialog?
      }
      return false;
    }).end().find('.h5peditor-remove').click(function () {
      that.removeCallback();
      that.hideDialog();
      return false;
    });

    // Get editor default font size.
    this.fontSize = parseInt(this.$editor.css('fontSize'));
  };

  /**
   * Create HTML for the field.
   *
   * @returns {@exp;H5PEditor@call;createItem}
   */
  C.prototype.createHtml = function () {
    var html = '';
    if (this.field.label !== 0) {
      html += '<span class="h5peditor-label">' + this.field.label + '</span>';
    }

    html += '<div class="h5peditor-dragnbar"></div>'
      + '<div class="h5peditor-dragquestion">' + C.t('noTaskSize') + '</div>'
      + '<div class="h5peditor-fluid-dialog">'
      + '  <div class="h5peditor-fd-inner"></div>'
      + '  <div class="h5peditor-fd-buttons">'
      + '    <a href="#" class="h5peditor-fd-button h5peditor-done">' + C.t('done') + '</a>'
      + '    <a href="#" class="h5peditor-fd-button h5peditor-remove">' + C.t('remove') + '</a>'
      + '  </div>'
      + '</div>';

    if (this.field.description !== undefined) {
      html += '<div class="h5peditor-field-description">' + this.field.description + '</div>';
    }

    return H5PEditor.createItem(this.field.widget, html);
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
      // Add correct base path
      path = 'url("' + H5P.getPath(path, H5PEditor.contentId) + '")';
    }

    this.$editor.css({
      backgroundImage: path
    });
  };

  /**
   * Set current dimensions.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setSize = function (params) {
    this.size = params;
  };

  /**
   * Apply new size to task editor once visible.
   *
   * @returns {undefined}
   */
  C.prototype.setActive = function () {
    if (this.size === undefined || this.size.width === undefined) {
      return;
    }
    var maxWidth = this.$item.width();
    if (this.size.width < maxWidth) {
      this.$editor.css({
        width: this.size.width,
        height: this.size.height,
        fontSize: this.fontSize
      });
      this.$dnbWrapper.css({
        width: this.size.width
      });
    }
    else {
      this.$editor.css({
        width: '100%',
        height: maxWidth * (this.size.height / this.size.width),
        fontSize: this.fontSize * (maxWidth / this.size.width)
      });
      this.$dnbWrapper.css({
        width: '100%'
      });
    }


    // TODO: Should we care about resize events? Will only be an issue for responsive designs.

    if (this.dnb === undefined) {
      this.activateEditor();
    }

    // TODO: Move elements that is outside inside.
  };

  /**
   * Activate DragNBar and add elements.
   *
   * @returns {undefined}
   */
  C.prototype.activateEditor = function () {
    var that = this;
    this.$editor.html('').addClass('h5p-ready');

    // Create new bar
    this.dnb = new H5P.DragNBar(this.getButtons(), this.$editor);

    // Add event handling
    this.dnb.stopMovingCallback = function (x, y) {
      // Update params when the element is dropped.
      var id = that.dnb.dnd.$element.data('id');
      var params = that.dnb.dnd.$element.hasClass('h5p-dq-dz') ? that.params.dropZones[id] : that.params.elements[id];
      params.x = x;
      params.y = y;
    };
    this.dnb.dnd.releaseCallback = function () {
      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        setTimeout(function () {
          that.dnb.dnd.$element.dblclick();
        }, 1);
        that.dnb.newElement = false;
      }
    };
    this.dnb.attach(this.$dnbWrapper);

    // Init resize
    this.dnr = new H5P.DragNResize(this.$editor);
    this.dnr.resizeCallback = function (newWidth, newHeight) {
      var id = that.dnr.$element.data('id');
      var params = that.dnr.$element.hasClass('h5p-dq-dz') ? that.params.dropZones[id] : that.params.elements[id];
      params.width = newWidth;
      params.height = newHeight;
    };
    this.dnr.snap = 10;

    H5P.$body.keydown(function (event) {
      if (event.keyCode === 17 && that.dnr.snap !== undefined) {
        delete that.dnr.snap;
      }
    }).keyup(function (event) {
      if (event.keyCode === 17) {
        that.dnr.snap = 10;
      }
    });

    this.elements = [];
    this.dropZones = [];

    // Add Elements
    for (var i = 0; i < this.params.elements.length; i++) {
      this.insertElement(i);
    }

    // Add Drop Zones
    for (var i = 0; i < this.params.dropZones.length; i++) {
      this.insertDropZone(i);
    }
  };

  /**
   * Generate sub forms that's ready to use in the dialog.
   *
   * @param {Object} semantics
   * @param {Object} params
   * @returns {_L8.C.prototype.generateElementForm.Anonym$2}
   */
  C.prototype.generateForm = function (semantics, params) {
    var $form = $('<div></div>');
    H5PEditor.processSemanticsChunk(semantics, params, $form, this);
    var $lib = $form.children('.library:first');
    if ($lib.length !== 0) {
      $lib.children('label, select, .h5peditor-field-description').hide().end().children('.libwrap').css('margin-top', '0');
    }

    return {
      $form: $form,
      children: this.children
    };
  };

  /**
   * Generate a list of buttons for DnB.
   *
   * @returns {Array} Buttons
   */
  C.prototype.getButtons = function () {
    var that = this;

    var buttons = [{
      id: 'dropzone',
      title: 'Drop Zone',
      createElement: function () {
        that.params.dropZones.push({
          x: 0,
          y: 0,
          width: 5,
          height: 2.5,
          correctElements: []
        });

        return that.insertDropZone(that.params.dropZones.length - 1);
      }
    }];

    for (var i = 0; i < this.elementLibraryOptions.length; i++) {
      buttons.push(this.getButton(this.elementLibraryOptions[i]));
    }

    return buttons;
  };

  /**
   * Generate a single element button for the DnB.
   *
   * @param {String} library Library name + version
   * @returns {Object} DnB button semantics
   */
  C.prototype.getButton = function (library) {
    var that = this;
    var id = library.split(' ')[0].split('.')[1].toLowerCase();
    var h = id === 'text' ? 1.25 : 5;
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
          width: 5,
          height: h,
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
   * @returns {jQuery} The element's DOM
   */
  C.prototype.insertElement = function (index) {
    var that = this;
    var elementParams = this.params.elements[index];
    var element = this.generateForm(this.elementFields, elementParams);

    var library = this.children[0];

    // Get image aspect ratio
    var libraryChange = function () {
      if (library.children[0].field.type === 'image') {
        library.children[0].changes.push(function (params) {
          if (params === undefined) {
            return;
          }

          if (params.width !== undefined && params.height !== undefined) {
            elementParams.height = elementParams.width * (params.height / params.width);
            element.$element.css('height', elementParams.height + 'em');
          }
        });
      }
    };

    if (library.children === undefined) {
      library.changes.push(libraryChange);
    }
    else {
      libraryChange();
    }

    element.$element = $('<div class="h5p-dq-element" style="width:' + elementParams.width + 'em;height:' + elementParams.height + 'em;top:' + elementParams.y + '%;left:' + elementParams.x + '%"></div>')
      .appendTo(this.$editor)
      .data('id', index)
      .dblclick(function () {
        if (that.editingDropZone !== undefined) {
          // Prevent double editing when drop zones are inside static texts
          delete that.editingDropZone;
        }
        else {
          that.editElement(element);
        }
      }).hover(function () {
        C.setElementOpacity(element.$element, elementParams.backgroundOpacity);
      }, function () {
        C.setElementOpacity(element.$element, elementParams.backgroundOpacity);
      });
    
    this.dnb.add(element.$element);

    // Update element
    that.updateElement(element, index);

    this.elements[index] = element;
    return element.$element;
  };

  /**
   * Set callbacks and open dialog with the form for the given element.
   *
   * @param {Object} element
   * @returns {undefined}
   */
  C.prototype.editElement = function (element) {
    var that = this;
    var id = element.$element.data('id');

    this.doneCallback = function () {
      // Validate form
      var valid = true;
      for (var i = 0; i < element.children.length; i++) {
        if (element.children[i].validate() === false) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        return false;
      }

      // Update element
      that.updateElement(element, id);

      // TODO: Resize element if it's to small
//      var params = that.params.elements[id];
//      if (params.type.library.split(' ')[0] === 'H5P.Text' && (params.dropZones === undefined || params.dropZones.length === 0)) {
//        console.log('Are you too small sir?', params.type.params.text);
//      }
    };

    this.removeCallback = function () {
      var i, j, ce;

      // Remove element form
      H5PEditor.removeChildren(element.children);

      // Remove element
      element.$element.remove();
      that.elements.splice(id, 1);
      that.params.elements.splice(id, 1);

      // Remove from options
      this.elementOptions.splice(id, 1);

      // Update drop zone params
      for (i = 0; i < that.params.dropZones.length; i++) {
        ce = that.params.dropZones[i].correctElements;
        for (j = 0; j < ce.length; j++) {
          if (ce[j] === '' + id) {
            // Remove from correct answers
            ce.splice(j, 1);
          }
          else if (ce[j] > id) {
            // Adjust index for others
            ce[j] = '' + (ce[j] - 1);
          }
        }
      }

      // Change data index for "all" elements
      for (i = id; i < that.elements.length; i++) {
        that.elements[i].$element.data('id', i);
        that.elementOptions[i].value = '' + i;
      }
    };

    element.children[this.elementDropZoneFieldWeight].setActive();
    this.showDialog(element.$form);
  };

  /**
   * Update the element with new data.
   *
   * @param {Object} element
   * @param {int} id
   * @returns {undefined}
   */
  C.prototype.updateElement = function (element, id) {
    var self = this;
    var params = this.params.elements[id];
    var type = (params.type.library.split(' ')[0] === 'H5P.Text' ? 'text' : 'image');
    var draggable = (params.dropZones !== undefined && params.dropZones.length);
    
    if (!draggable && type === 'text') {
      var ids = [];
      
      // Update text params
      params.type.params.text = C.processParamsText(params.type.params.text, self.params.dropZones, ids);
      
      if (element.children[0].children !== undefined && element.children[0].children[0].ckeditor !== undefined) {
        // Update CK with text
        element.children[0].children[0].ckeditor.setData(params.type.params.text);
      }
      
      // Create new text instance, replacing valid drop zones with spans
      element.instance = H5P.newRunnable({
        library: params.type.library,
        params: {
          text: C.processParamsHtml(params.type.params.text, ids)
        }
      }, H5PEditor.contentId, element.$element);
    }
    else {
      // Create new instance
      element.instance = H5P.newRunnable(params.type, H5PEditor.contentId, element.$element);
    }

    // Make resize possible
    this.dnr.add(element.$element);

    // Find label text without html
    var label = (type === 'text' ? $('<div>' + element.instance.text + '</div>').text() : params.type.params.alt + '');

    // Update correct element options
    this.elementOptions[id] = {
      value: '' + id,
      label: C.t(type) + ': ' + C.getLabel(label)
    };

    if (draggable) {
      element.$element.addClass('h5p-draggable');
    }
    else {
      element.$element.removeClass('h5p-draggable');
      
      if (type === 'text') {
        element.$element.find('.h5p-dq-dz').each(function (i) {
          self.insertDropZone(ids[i], $(this));
        });
      }
    }
    
    C.setElementOpacity(element.$element, params.backgroundOpacity);
  };

  /**
   * Clips text at 32 chars
   * 
   * @param {String} text
   * @returns {String}
   */
  C.getLabel = function (text) {
    return (text.length > 32 ? text.substr(0, 32) + '...' : text);
  };

  /**
   * Find all drop zones inserted with *id:text*. 
   * Adds a new DZ if no id is present.
   * 
   * @param {String} text
   * @param {Array} dropZones params
   * @param {Array} ids All valid DZ ids.
   * @returns {undefined}
   */
  C.processParamsText = function (text, dropZones, ids) {
    if (text === undefined) {
      return;
    }
    text = text.replace(/\*(\d+:)?([^*]+)\*/g, function (original, id, text) {
      id = parseInt(id);
      
      if (isNaN(id)) {
        // Insert new drop zone
        dropZones.push({
          x: -1,
          y: -1,
          width: -1,
          height: -1,
          backgroundOpacity: 0,
          correctElements: [],
          label: C.getLabel(text),
          showLabel: false
        });
        id = dropZones.length - 1;
        ids.push(id);

        // Add id to text
        return '*' + id + ':' + text + '*';
      }
      
      if (dropZones[id] !== undefined && dropZones[id].x === -1) {
        // Exists use it
        ids.push(id);
      }
      
      return original;
    });
    
    return text;
  };

  /**
   * Replace drop zones inserted with *id:text*. 
   * 
   * @param {String} text
   * @param {Array} ids All valid DZ ids.
   * @returns {undefined}
   */
  C.processParamsHtml = function (html, ids) {
    if (html === undefined) {
      return;
    }
    html = html.replace(/\*(\d+):([^*]+)\*/g, function (original, id, text) {
      id = parseInt(id);
      for (var i = 0; i < ids.length; i++) {
        if (ids[i] === id) {
          return '<span class="h5p-dq-dz">' + text + '</span>'; 
        }
      }
      return original;
    });
    
    return html;
  };

  /**
   * Insert the drop zone at the given index.
   *
   * @param {int} index
   * @returns {unresolved}
   */
  C.prototype.insertDropZone = function (index, $element) {
    var that = this,
      dropZoneParams = this.params.dropZones[index],
      dropZone = this.generateForm(this.dropZoneFields, dropZoneParams);

    if ($element !== undefined) {
      dropZone.$dropZone = $element;
    }
    else {
      if (dropZoneParams.x === -1) {
        return; // Do not insert, inside DZ should already have an $element.
      }
      dropZone.$dropZone = $('<div class="h5p-dq-dz" style="width:' + dropZoneParams.width + 'em;height:' + dropZoneParams.height + 'em;top:' + dropZoneParams.y + '%;left:' + dropZoneParams.x + '%"></div>')
        .appendTo(this.$editor);

      // Make moving possible
      this.dnb.add(dropZone.$dropZone);
      
      // Make resize possible
      this.dnr.add(dropZone.$dropZone);
    }

    // Make editable
    dropZone.$dropZone
      .data('id', index)
      .dblclick(function () {
        // Edit
        that.editDropZone(dropZone);
        that.editingDropZone = true;
      });

    // Add tip if any
    if (dropZoneParams.tip !== undefined && dropZoneParams.tip.trim().length > 0) {
      dropZone.$dropZone.append(H5P.JoubelUI.createTip(dropZoneParams.tip, {showSpeechBubble: false}));
    }

    // Add label
    this.updateDropZone(dropZone, index);

    this.dropZones[index] = dropZone;
    return dropZone.$dropZone;
  };

  /**
   * Set callbacks and open dialog with the form for the given drop zone.
   *
   * @param {Object} dropZone
   * @returns {undefined}
   */
  C.prototype.editDropZone = function (dropZone) {
    var that = this;
    var id = dropZone.$dropZone.data('id');

    this.doneCallback = function () {
      // Validate form
      var valid = true;
      for (var i = 0; i < dropZone.children.length; i++) {
        if (dropZone.children[i].validate() === false) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        return false;
      }

      that.updateDropZone(dropZone, id);
    };

    this.removeCallback = function () {
      that.removeDropZone(id);
    };

    // Add only available options
    var options = this.dropZoneFields[this.dropZoneElementFieldWeight].options = [];
    var dropZones;
    for (var i = 0; i < this.elementOptions.length; i++) {
      dropZones = this.params.elements[i].dropZones;
      for (var j = 0; j < dropZones.length; j++) {
        if (dropZones[j] === (id + '')) {
          options.push(this.elementOptions[i]);
          break;
        }
      }
    }

    dropZone.children[this.dropZoneElementFieldWeight].setActive();
    this.showDialog(dropZone.$form);
  };

  /**
   * Remove drop zone with given id.
   * 
   * @param {Number} id
   * @returns {undefined}
   */
  C.prototype.removeDropZone = function (id) {
    var self = this;
    var dropZone = self.dropZones[id];
    
    // Remove element form
    H5PEditor.removeChildren(dropZone.children);

    // Remove element
    dropZone.$dropZone.remove();
    self.dropZones.splice(id, 1);
    self.params.dropZones.splice(id, 1);

    // Remove from elements
    self.elementFields[self.elementDropZoneFieldWeight].options.splice(id, 1);

    // Remove dropZone from element params properly
    for (var i = 0; i < self.params.elements.length; i++) {
      var element = self.params.elements[i];
      for (var j = 0; j < element.dropZones.length; j++) {
        if (parseInt(element.dropZones[j]) === id) {
          // Remove from element drop zones
          element.dropZones.splice(j, 1);
          if (!element.dropZones.length) {
            self.elements[i].$element.removeClass('h5p-draggable');
          }
        }
        else if (element.dropZones[j] > id) {
          // Re index other drop zones
          element.dropZones[j] = '' + (element.dropZones[j] - 1);
        }
      }
      
      if (element.type.library.split(' ')[0] === 'H5P.Text' && (element.dropZones === undefined || element.dropZones.length === 0)) {
        // Update drop zones inserted via params text
        element.type.params.text = element.type.params.text.replace(/\*(\d+):([^*]+)\*/g, function (original, i, text) {
          i = parseInt(i);
          if (i === id) {
            return text;
          }
          else if (i > id) {
            return '*' + (i - 1) + ':' + text + '*';
          }
          return original;
        });
        
        var children = self.elements[i].children[0].children;
        if (children !== undefined) {
          // Update CK with text
          children[0].$input.html(element.type.params.text);
          if (children[0].ckeditor !== undefined) {
            children[0].ckeditor.setData(element.type.params.text);
          }
        }
      }
    }

    // Reindex all dropzones
    for (i = id; i < self.dropZones.length; i++) {
      self.dropZones[i].$dropZone.data('id', i);
      self.elementFields[self.elementDropZoneFieldWeight].options[i].value = i + '';
    }
  };

  /**
   * Remove old label and add new.
   *
   * @param {Object} dropZone
   * @param {int} id
   * @returns {undefined}
   */
  C.prototype.updateDropZone = function (dropZone, id) {
    var params = this.params.dropZones[id];

    // Remove old label and add new.
    dropZone.$dropZone.children('.h5p-dq-dz-label').remove();
    if (params.showLabel === true) {
      $('<div class="h5p-dq-dz-label">' + params.label + '</div>').appendTo(dropZone.$dropZone);
      dropZone.$dropZone.addClass('h5p-has-label');
    }
    else {
      dropZone.$dropZone.removeClass('h5p-has-label');
    }
    
    // Update Tip:
    dropZone.$dropZone.children('.joubel-tip-container').remove();
    if (params.tip !== undefined && params.tip.trim().length > 0) {
      dropZone.$dropZone.append(H5P.JoubelUI.createTip(params.tip, {showSpeechBubble: false}));
    }

    this.elementFields[this.elementDropZoneFieldWeight].options[id] = {
      value: '' + id,
      label: params.label
    };

    C.setOpacity(dropZone.$dropZone.add(dropZone.$dropZone.children('.h5p-dq-dz-label')), 'background', params.backgroundOpacity);
  };

  /**
   * Attach form to dialog and show.
   *
   * @param {jQuery} $form
   * @returns {undefined}
   */
  C.prototype.showDialog = function ($form) {
    this.dnb.blur();
    this.$currentForm = $form;
    $form.appendTo(this.$dialogInner);
    this.$dialog.show();
    this.$editor.add(this.$dnbWrapper).hide();
  };

  /**
   * Hide dialog and detach form.
   *
   * @returns {undefined}
   */
  C.prototype.hideDialog = function () {
    // Attempt to find and close CKEditor instances before detaching.
    if (H5PEditor.Html) {
      H5PEditor.Html.removeWysiwyg();
    }

    this.$currentForm.detach();
    this.$dialog.hide();
    this.$editor.add(this.$dnbWrapper).show();
  };

  /**
   * Update transparency for background, shadow and border.
   *
   * @param {jQuery} $element
   * @param {Number} opacity
   */
  C.setElementOpacity = function ($element, opacity) {
    C.setOpacity($element, 'background', opacity);
    C.setOpacity($element, 'boxShadow', opacity);
    C.setOpacity($element, 'borderColor', opacity);
  };

  /**
   * Updates alpha channel for colors in the given style.
   *   
   * @param {String} style
   * @param {String} prefix
   * @param {Number} alpha
   */
  C.setAlphas = function (style, prefix, alpha) {
    var colorStart = style.indexOf(prefix);
    
    while (colorStart !== -1) {
      var colorEnd = style.indexOf(')', colorStart);
      var channels = style.substring(colorStart + prefix.length, colorEnd).split(',');
      
      // Set alpha channel
      channels[3] = (channels[3] !== undefined ? parseFloat(channels[3]) * alpha : alpha);
      
      style = style.substring(0, colorStart) + 'rgba(' + channels.join(',') + style.substring(colorEnd, style.length);
            
      // Look for more colors
      colorStart = style.indexOf(prefix, colorEnd);
    }
    
    return style;
  };
  
  /**
   * Makes element background, border and shadow transparent.
   *
   * @param {jQuery} $element
   * @param {String} property
   * @param {Number} opacity
   */
  C.setOpacity = function ($element, property, opacity) {
    if (property === 'background') {
      // Set both color and gradient.
      C.setOpacity($element, 'backgroundColor', opacity);
      C.setOpacity($element, 'backgroundImage', opacity);
      return;
    }
    
    opacity = (opacity === undefined ? 1 : opacity / 100);
    
    // Private. Get css properties objects.
    function getProperties(property, value) {
      switch (property) {
        case 'borderColor':
          return {
            borderTopColor: value,
            borderRightColor: value,
            borderBottomColor: value,
            borderLeftColor: value
          };
        
        default:
          var properties = {};
          properties[property] = value;
          return properties;
      }
    }
    
    // Reset css to be sure we're using CSS and not inline values.
    var properties = getProperties(property, '');
    $element.css(properties);
    
    for (var prop in properties) {
      break;
    }
    var style = $element.css(prop); // Assume all props are the same and use the first.
    style = C.setAlphas(style, 'rgba(', opacity); // Update rgba
    style = C.setAlphas(style, 'rgb(', opacity); // Convert rgb
    
    $element.css(getProperties(property, style));
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
   * Remove the field from DOM.
   *
   * @returns {undefined}
   */
  C.prototype.remove = function () {
    this.$item.remove();
  };

  /**
   * Collect functions to execute once the tree is complete.
   *
   * @param {function} ready
   * @returns {undefined}
   */
  C.prototype.ready = function (ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
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
    insertElement: 'Insert :type',
    done: 'Done',
    remove: 'Remove',
    image: 'Image',
    text: 'Text',
    noTaskSize: 'Please specify task size first.'
  }
};