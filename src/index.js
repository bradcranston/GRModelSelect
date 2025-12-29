// Manufacturer Selection Interface for FileMaker WebViewer

class ManufacturerSelector {
  constructor() {
    this.manufacturers = [];
    this.filteredManufacturers = [];
    this.selectedManufacturer = null;
    this.models = [];
    this.filteredModels = [];
    this.currentView = 'manufacturers'; // 'manufacturers' or 'models'
    this.isDuplicateMode = false; // Flag for duplicate models mode
    this.newModelData = null; // Data for new model when in duplicate mode
    this.filters = {
      coolers: true,
      warmers: true,
      search: ''
    };
    this.modelFilters = {
      search: ''
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
    // Interface is ready, FileMaker can now call loadManufacturers()
    console.log('Manufacturer Selector initialized and ready for data');
  }

  bindEvents() {
    // Filter controls
    const filterCoolers = document.getElementById('filter-coolers');
    const filterWarmers = document.getElementById('filter-warmers');
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    
    // Model search controls
    const modelSearchInput = document.getElementById('model-search-input');
    const clearModelSearch = document.getElementById('clear-model-search');
    
    // Back button
    const backBtn = document.getElementById('back-btn');

    filterCoolers.addEventListener('change', () => {
      this.filters.coolers = filterCoolers.checked;
      this.applyFilters();
    });

    filterWarmers.addEventListener('change', () => {
      this.filters.warmers = filterWarmers.checked;
      this.applyFilters();
    });

    searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    });

    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      this.filters.search = '';
      this.applyFilters();
    });
    
    modelSearchInput.addEventListener('input', (e) => {
      this.modelFilters.search = e.target.value.toLowerCase();
      this.applyModelFilters();
    });

    clearModelSearch.addEventListener('click', () => {
      modelSearchInput.value = '';
      this.modelFilters.search = '';
      this.applyModelFilters();
    });
    
    backBtn.addEventListener('click', () => {
      this.showManufacturers();
    });
  }

  // Function to be called by FileMaker with manufacturer data
  loadManufacturers(manufacturerData) {
    try {
      // Parse string parameter from FileMaker if needed
      let parsedData = manufacturerData;
      if (typeof manufacturerData === 'string') {
        try {
          parsedData = JSON.parse(manufacturerData);
        } catch (parseError) {
          console.error('Error parsing JSON string from FileMaker:', parseError);
          this.showError('Invalid JSON data received from FileMaker');
          return;
        }
      }
      
      // Handle both direct array and OData format
      const manufacturers = parsedData.value || parsedData;
      
      // Ensure we have an array
      if (!Array.isArray(manufacturers)) {
        console.error('Expected array of manufacturers, got:', typeof manufacturers);
        this.showError('Invalid manufacturer data format');
        return;
      }
      
      this.manufacturers = manufacturers.map(mfg => ({
        id: this.extractId(mfg),
        __ID: mfg.__ID || null,
        name: mfg.name,
        makesCoolers: Boolean(mfg.f_makesCoolers),
        makesWarmers: Boolean(mfg.f_makesWarmers),
        editLink: mfg['@odata.editLink'] || null
      }));
      
      // Sort manufacturers alphabetically
      this.manufacturers.sort((a, b) => a.name.localeCompare(b.name));
      
      this.applyFilters();
      console.log(`Loaded ${this.manufacturers.length} manufacturers`);
    } catch (error) {
      console.error('Error loading manufacturers:', error);
      this.showError('Failed to load manufacturer data');
    }
  }

  extractId(manufacturer) {
    if (manufacturer['@odata.id']) {
      const match = manufacturer['@odata.id'].match(/\((\d+)\)$/);
      return match ? parseInt(match[1]) : manufacturer.name;
    }
    return manufacturer.id || manufacturer.name;
  }

  applyFilters() {
    this.filteredManufacturers = this.manufacturers.filter(mfg => {
      // Filter by type
      const typeMatch = (this.filters.coolers && mfg.makesCoolers) || 
                       (this.filters.warmers && mfg.makesWarmers);
      
      // Filter by search term
      const searchMatch = !this.filters.search || 
                         mfg.name.toLowerCase().includes(this.filters.search);
      
      return typeMatch && searchMatch;
    });
    
    this.renderManufacturers();
  }

  renderManufacturers() {
    const grid = document.getElementById('manufacturer-grid');
    
    if (this.filteredManufacturers.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <p>No manufacturers found matching your criteria.</p>
          <p>Try adjusting your filters or search term.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredManufacturers.map(mfg => `
      <div class="manufacturer-card" data-id="${mfg.id}">
        <div class="manufacturer-name">${this.escapeHtml(mfg.name)}</div>
        <div class="manufacturer-types">
          ${mfg.makesCoolers ? '<span class="type-badge coolers">Coolers</span>' : ''}
          ${mfg.makesWarmers ? '<span class="type-badge warmers">Warmers</span>' : ''}
        </div>
      </div>
    `).join('');

    // Add click handlers to manufacturer cards
    grid.querySelectorAll('.manufacturer-card').forEach(card => {
      card.addEventListener('click', () => {
        const manufacturerId = card.dataset.id;
        this.selectManufacturer(manufacturerId);
      });
    });
  }

  selectManufacturer(manufacturerId) {
    // Find the manufacturer
    const manufacturer = this.manufacturers.find(mfg => mfg.id == manufacturerId);
    
    if (!manufacturer) {
      console.error('Manufacturer not found:', manufacturerId);
      return;
    }

    // Update selection for visual feedback
    this.selectedManufacturer = manufacturer;
    
    // Update UI
    document.querySelectorAll('.manufacturer-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    document.querySelector(`[data-id="${manufacturerId}"]`).classList.add('selected');
    
    console.log('Selected manufacturer:', manufacturer.name);
    
    // Immediately call FileMaker script with manufacturer data
    this.callFileMakerScript(manufacturer);
  }

  // Function to be called by FileMaker with model data
  loadModels(modelData) {
    try {
      console.log('loadModels called with:', modelData);
      console.log('Type of modelData:', typeof modelData);
      
      // Parse string parameter from FileMaker if needed
      let parsedData = modelData;
      if (typeof modelData === 'string') {
        try {
          parsedData = JSON.parse(modelData);
        } catch (parseError) {
          console.error('Error parsing JSON string from FileMaker:', parseError);
          this.showError('Invalid JSON data received from FileMaker');
          return;
        }
      }
      
      console.log('Parsed data:', parsedData);
      
      // Handle both direct array and OData format
      const models = parsedData.value || parsedData;
      
      console.log('Models array:', models);
      console.log('Models array type:', typeof models);
      console.log('Is array?', Array.isArray(models));
      
      // Ensure we have an array
      if (!Array.isArray(models)) {
        console.error('Expected array of models, got:', typeof models, models);
        this.showError('Invalid model data format');
        return;
      }
      
      console.log('First model structure:', models[0]);
      
      this.models = models.map(model => {
        console.log('Processing model:', model);
        return {
          id: this.extractModelId(model),
          __ID: model.__ID || null,
          model: model.Model || '',
          productType: model.ProductType || '',
          refrigeratorType: model.Refrigerator_Type || '',
          door: model.Door || '',
          doorOption: model.DoorOption || '',
          gasketProfile: model.Gasket_Profile || '',
          width: model.Width || '',
          height: model.Height || '',
          equipmentLocation: model.Equipment_Location_Description || '',
          itemNote: model.Item_Note_Display || '',
          editLink: model['@odata.editLink'] || null,
          f_backerRodNeeded: model.f_backerRodNeeded || 0,
          f_fillerNeeded: model.f_fillerNeeded || 0,
          f_substitutePart: model.f_substitutePart || 0,
          gasketLinear_Ft: model.gasketLinear_Ft || 0,
          gasketLinear_In: model.gasketLinear_In || 0,
          gasketLinearSub_Ft: model.gasketLinearSub_Ft || 0,
          invertedProfile: model.InvertedProfile || null,
          item_Note: model.Item_Note || null,
          noMagnet: model.NoMagnet || null
        };
      });
      
      // Sort models by model name/number
      this.models.sort((a, b) => (a.model || '').localeCompare(b.model || ''));
      
      this.showModels();
      console.log(`Loaded ${this.models.length} models for ${this.selectedManufacturer?.name}`);
    } catch (error) {
      console.error('Error loading models:', error);
      console.error('Error stack:', error.stack);
      this.showError('Failed to load model data');
    }
  }

  // Function to load models directly without manufacturer selection
  loadDupModels(modelData, newModelData = null) {
    try {
      console.log('loadDupModels called with:', modelData);
      console.log('New model data:', newModelData);
      console.log('Type of modelData:', typeof modelData);
      
      // Store the new model data for later use
      this.newModelData = newModelData;
      
      // Parse new model data if it's a string
      if (typeof newModelData === 'string') {
        try {
          this.newModelData = JSON.parse(newModelData);
          console.log('Parsed new model data:', this.newModelData);
        } catch (parseError) {
          console.error('Error parsing new model data:', parseError);
          this.newModelData = null;
        }
      }
      
      // Parse string parameter from FileMaker if needed
      let parsedData = modelData;
      if (typeof modelData === 'string') {
        try {
          parsedData = JSON.parse(modelData);
        } catch (parseError) {
          console.error('Error parsing JSON string from FileMaker:', parseError);
          this.showError('Invalid JSON data received from FileMaker');
          return;
        }
      }
      
      console.log('Parsed data:', parsedData);
      
      // Handle both direct array and OData format
      const models = parsedData.value || parsedData;
      
      console.log('Models array:', models);
      console.log('Models array type:', typeof models);
      console.log('Is array?', Array.isArray(models));
      
      // Ensure we have an array
      if (!Array.isArray(models)) {
        console.error('Expected array of models, got:', typeof models, models);
        this.showError('Invalid model data format');
        return;
      }
      
      console.log('First model structure:', models[0]);
      
      this.models = models.map(model => {
        console.log('Processing model:', model);
        return {
          id: this.extractModelId(model),
          __ID: model.__ID || null,
          model: model.Model || '',
          manufacturerName: model.Manufacturer || model.ManufacturerName || null,
          productType: model.ProductType || '',
          refrigeratorType: model.Refrigerator_Type || '',
          door: model.Door || '',
          doorOption: model.DoorOption || '',
          gasketProfile: model.Gasket_Profile || '',
          width: model.Width || '',
          height: model.Height || '',
          equipmentLocation: model.Equipment_Location_Description || '',
          itemNote: model.Item_Note_Display || '',
          editLink: model['@odata.editLink'] || null,
          f_backerRodNeeded: model.f_backerRodNeeded || 0,
          f_fillerNeeded: model.f_fillerNeeded || 0,
          f_substitutePart: model.f_substitutePart || 0,
          gasketLinear_Ft: model.gasketLinear_Ft || 0,
          gasketLinear_In: model.gasketLinear_In || 0,
          gasketLinearSub_Ft: model.gasketLinearSub_Ft || 0,
          invertedProfile: model.InvertedProfile || null,
          item_Note: model.Item_Note || null,
          noMagnet: model.NoMagnet || null
        };
      });
      
      // Sort models by model name/number
      this.models.sort((a, b) => (a.model || '').localeCompare(b.model || ''));
      
      // Extract manufacturer name from the first model or original data
      const manufacturerName = this.models[0]?.manufacturerName || 
                              models[0]?.Manufacturer || 
                              models[0]?.ManufacturerName ||
                              'Unknown Manufacturer';
      
      // Set manufacturer info for display purposes
      this.selectedManufacturer = {
        id: 'dup',
        __ID: models[0]?.ManufacturerID || null,
        name: manufacturerName
      };
      
      // Set duplicate mode flag
      this.isDuplicateMode = true;
      
      this.showModels();
      console.log(`Loaded ${this.models.length} models directly for ${manufacturerName}`);
    } catch (error) {
      console.error('Error loading models directly:', error);
      console.error('Error stack:', error.stack);
      this.showError('Failed to load model data');
    }
  }
  
  extractModelId(model) {
    if (model['@odata.id']) {
      const match = model['@odata.id'].match(/\((\d+)\)$/);
      return match ? parseInt(match[1]) : model.Model;
    }
    return model.id || model.Model;
  }
  
  showModels() {
    this.currentView = 'models';
    
    if (this.isDuplicateMode) {
      // Update header for duplicate mode
      document.getElementById('page-title').textContent = 'Duplicate Models Found';
      document.getElementById('back-btn').style.display = 'none';
      
      // Add subtitle and new model button with equipment data
      const header = document.querySelector('.title-bar');
      let subtitle = header.querySelector('.subtitle');
      if (!subtitle) {
        subtitle = document.createElement('div');
        subtitle.className = 'subtitle';
        header.appendChild(subtitle);
      }
      subtitle.textContent = 'Select a model to overwrite or add new model';
      
      // Add equipment data display
      let equipmentDisplay = header.querySelector('.equipment-display');
      if (!equipmentDisplay && this.newModelData) {
        equipmentDisplay = document.createElement('div');
        equipmentDisplay.className = 'equipment-display';
        header.appendChild(equipmentDisplay);
      }
      
      console.log('Equipment display element:', equipmentDisplay);
      console.log('New model data:', this.newModelData);
      
      if (equipmentDisplay && this.newModelData) {
        equipmentDisplay.innerHTML = `
          <div class="equipment-table">
            <div class="model-header">
              <div class="col-model">Model</div>
              <div class="col-type">Type</div>
              <div class="col-gasket">Gasket Profile</div>
              <div class="col-width">W</div>
              <div class="col-height">H</div>
            </div>
            <div class="model-row equipment-row-data">
              <div class="model-main">
                <div class="col-model">
                  <div class="model-number">${this.escapeHtml(this.newModelData.Model || '')}</div>
                  <div class="manufacturer-name">${this.escapeHtml(this.newModelData.Manufacturer || '')}</div>
                </div>
                <div class="col-type">
                  <div class="product-type">${this.escapeHtml(this.newModelData.ProductType || '')}</div>
                  <div class="refrigerator-type">${this.escapeHtml(this.newModelData.Refrigerator_Type || '')}</div>
                </div>
                <div class="col-gasket">
                  <span class="gasket-profile">${this.escapeHtml(this.newModelData.Gasket_Profile || '')}</span>
                </div>
                <div class="col-width">${this.newModelData.Width || ''}</div>
                <div class="col-height">${this.newModelData.Height || ''}</div>
              </div>
              <div class="model-details">
                <div class="door-info">${this.escapeHtml(this.newModelData.Item_Note_Display || this.newModelData.Door || '')}</div>
              </div>
            </div>
          </div>
        `;
      }
      
      let addButton = header.querySelector('.add-new-btn');
      if (!addButton) {
        addButton = document.createElement('button');
        addButton.className = 'add-new-btn back-button';
        addButton.textContent = 'Add New Model';
        addButton.addEventListener('click', () => {
          this.addNewModel();
        });
        header.appendChild(addButton);
      }
    } else {
      // Normal mode - show manufacturer name
      document.getElementById('page-title').textContent = `${this.selectedManufacturer.name} Models`;
      document.getElementById('back-btn').style.display = 'block';
      
      // Remove duplicate mode elements
      const header = document.querySelector('.title-bar');
      const subtitle = header.querySelector('.subtitle');
      const addButton = header.querySelector('.add-new-btn');
      const equipmentDisplay = header.querySelector('.equipment-display');
      if (subtitle) subtitle.remove();
      if (addButton) addButton.remove();
      if (equipmentDisplay) equipmentDisplay.remove();
    }
    
    // Show/hide appropriate sections
    document.getElementById('manufacturer-filters').style.display = 'none';
    document.getElementById('model-filters').style.display = 'flex';
    document.getElementById('manufacturer-grid').style.display = 'none';
    document.getElementById('model-grid').style.display = 'block';
    
    this.applyModelFilters();
  }
  
  showManufacturers() {
    this.currentView = 'manufacturers';
    this.isDuplicateMode = false; // Reset duplicate mode
    
    // Update header
    document.getElementById('page-title').textContent = 'Select Manufacturer';
    document.getElementById('back-btn').style.display = 'none';
    
    // Show/hide appropriate sections
    document.getElementById('manufacturer-filters').style.display = 'flex';
    document.getElementById('model-filters').style.display = 'none';
    document.getElementById('manufacturer-grid').style.display = 'block';
    document.getElementById('model-grid').style.display = 'none';
    
    // Clear model search
    document.getElementById('model-search-input').value = '';
    this.modelFilters.search = '';
  }
  
  applyModelFilters() {
    this.filteredModels = this.models.filter(model => {
      // Filter by search term
      const searchMatch = !this.modelFilters.search || 
                         model.model.toLowerCase().includes(this.modelFilters.search) ||
                         model.gasketProfile.toLowerCase().includes(this.modelFilters.search) ||
                         model.refrigeratorType.toLowerCase().includes(this.modelFilters.search);
      
      return searchMatch;
    });
    
    this.renderModels();
  }
  
  renderModels() {
    const grid = document.getElementById('model-grid');
    
    if (this.filteredModels.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <p>No models found matching your criteria.</p>
          <p>Try adjusting your search term.</p>
        </div>
      `;
      return;
    }

    // Create table structure similar to FileMaker interface
    grid.innerHTML = `
      <div class="model-table">
        <div class="model-header">
          <div class="col-model">Model</div>
          <div class="col-type">Type</div>
          <div class="col-gasket">Gasket Profile</div>
          <div class="col-width">W</div>
          <div class="col-height">H</div>
        </div>
        ${this.filteredModels.map(model => `
          <div class="model-row" data-id="${model.id}">
            <div class="model-main">
              <div class="col-model">
                <div class="model-number">${this.escapeHtml(model.model)}</div>
                <div class="manufacturer-name">${this.escapeHtml(model.manufacturerName || this.selectedManufacturer?.name || 'Unknown')}</div>
              </div>
              <div class="col-type">
                <div class="product-type">${this.escapeHtml(model.productType)}</div>
                <div class="refrigerator-type">${this.escapeHtml(model.refrigeratorType)}</div>
              </div>
              <div class="col-gasket">
                <span class="gasket-profile">${this.escapeHtml(model.gasketProfile)}</span>
              </div>
              <div class="col-width">${model.width}</div>
              <div class="col-height">${model.height}</div>
            </div>
            <div class="model-details">
              <div class="door-info">${this.escapeHtml(model.itemNote || model.door)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Add click handlers to model rows
    grid.querySelectorAll('.model-row').forEach(row => {
      row.addEventListener('click', () => {
        const modelId = row.dataset.id;
        this.selectModel(modelId);
      });
    });
  }
  
  selectModel(modelId) {
    // Find the model
    const model = this.models.find(m => m.id == modelId);
    
    if (!model) {
      console.error('Model not found:', modelId);
      return;
    }

    // Update UI selection
    document.querySelectorAll('.model-row').forEach(row => {
      row.classList.remove('selected');
    });
    
    document.querySelector(`[data-id="${modelId}"]`).classList.add('selected');
    
    console.log('Selected model:', model.model);
    
    // Call FileMaker script with model data
    this.callModelScript(model);
  }
  
  callFileMakerScript(manufacturer) {
    const result = {
      id: manufacturer.id,
      __ID: manufacturer.__ID,
      name: manufacturer.name,
      mode: 'ManufacturerSelected'
    };

    console.log('Calling FileMaker script with manufacturer data:', result);

    // Call FileMaker script
    if (window.FileMaker && window.FileMaker.PerformScript) {
      window.FileMaker.PerformScript('Manage: Gasket Model', JSON.stringify(result));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FileMaker) {
      // Alternative method for newer FileMaker versions
      window.webkit.messageHandlers.FileMaker.postMessage(JSON.stringify(result));
    } else {
      console.log('FileMaker script call would be made with:', result);
    }
  }
  
  callModelScript(model) {
    const result = {
      id: model.id,
      __ID: model.__ID,
      f_backerRodNeeded: model.f_backerRodNeeded,
      f_fillerNeeded: model.f_fillerNeeded,
      f_substitutePart: model.f_substitutePart,
      gasketLinear_Ft: model.gasketLinear_Ft,
      gasketLinear_In: model.gasketLinear_In,
      gasketLinearSub_Ft: model.gasketLinearSub_Ft,
      invertedProfile: model.invertedProfile,
      item_Note: model.item_Note,
      noMagnet: model.noMagnet,
      model: this.isDuplicateMode ? 'ModelUpdate' : model.model,
      productType: model.productType,
      refrigeratorType: model.refrigeratorType,
      door: model.door,
      doorOption: model.doorOption,
      gasketProfile: model.gasketProfile,
      width: model.width,
      height: model.height,
      equipmentLocation: model.equipmentLocation,
      itemNote: model.itemNote,
      editLink: model.editLink,
      manufacturer: {
        id: this.selectedManufacturer.id,
        __ID: this.selectedManufacturer.__ID,
        name: this.selectedManufacturer.name
      },
      mode: this.isDuplicateMode ? 'ModelUpdate' : 'ModelSelected'
    };

    // Call FileMaker script
    if (window.FileMaker && window.FileMaker.PerformScript) {
      window.FileMaker.PerformScript('Manage: Gasket Model', JSON.stringify(result));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FileMaker) {
      // Alternative method for newer FileMaker versions
      window.webkit.messageHandlers.FileMaker.postMessage({
        script: 'Manage: Gasket Model',
        parameter: JSON.stringify(result)
      });
    } else {
      // For testing without FileMaker
      console.log('Would call FileMaker script "Manage: Gasket Model" with:', result);
      alert(`Selected Model: ${result.model}\nManufacturer: ${result.manufacturer.name}\nMode: ${result.mode}`);
    }
  }
  
  addNewModel() {
    // Call FileMaker script to add new model
    const result = {
      mode: 'AddNewModel',
      model: 'ModelNew',
      newModelData: this.newModelData,
      manufacturer: {
        id: this.selectedManufacturer.id,
        __ID: this.selectedManufacturer.__ID,
        name: this.selectedManufacturer.name
      }
    };

    console.log('Adding new model for manufacturer:', result);

    // Call FileMaker script
    if (window.FileMaker && window.FileMaker.PerformScript) {
      window.FileMaker.PerformScript('Manage: Gasket Model', JSON.stringify(result));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FileMaker) {
      // Alternative method for newer FileMaker versions
      window.webkit.messageHandlers.FileMaker.postMessage(JSON.stringify(result));
    } else {
      console.log('FileMaker script call would be made with:', result);
      alert(`Adding new model for: ${result.manufacturer.name}`);
    }
  }

  showError(message) {
    const grid = document.getElementById('manufacturer-grid');
    grid.innerHTML = `
      <div class="error">
        <p>Error: ${this.escapeHtml(message)}</p>
        <p>Please try again or contact support.</p>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the manufacturer selector
const manufacturerSelector = new ManufacturerSelector();

// Expose functions to global scope for FileMaker to call
window.loadManufacturers = (data) => manufacturerSelector.loadManufacturers(data);
window.loadModels = (data) => manufacturerSelector.loadModels(data);
window.loadDupModels = (data, newModelData) => manufacturerSelector.loadDupModels(data, newModelData);
window.manufacturerSelector = manufacturerSelector;

// For testing purposes, load sample data if running in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Load the sample data from Manufacturers.json for testing
  fetch('./Manufacturers.json')
    .then(response => response.json())
    .then(data => {
      console.log('Loading sample data for testing...');
      manufacturerSelector.loadManufacturers(data);
    })
    .catch(error => {
      console.log('Could not load sample data for testing:', error);
    });
}