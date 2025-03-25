const notyf = new Notyf({
  duration: 2000, // Tempo de exibição
  position: { x: 'right', y: 'top' }, // Posição do toast
  dismissible: true,
});

const toastSystem = {
  container: null,
  toasts: {},
  
  init() {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
          this.container = document.createElement('div');
          this.container.id = 'toast-container';
          this.container.className = 'toast-container';
          document.body.appendChild(this.container);
      }
      
      // Configurar listeners para eventos do processo principal
      this.setupWppInitListeners();
  },
  
  // Garantir que o container exista
  ensureContainer() {
      if (!this.container) {
          this.container = document.getElementById('toast-container');
          if (!this.container) {
              this.container = document.createElement('div');
              this.container.id = 'toast-container';
              this.container.className = 'toast-container';
              document.body.appendChild(this.container);
          }
      }
      return this.container;
  },
  
  setupWppInitListeners() {
      // Usar as funções expostas pelo preload
      if (window.wppInitMonitor) {
          // Evento de início da inicialização
          window.wppInitMonitor.onInitStart((data) => {
              this.showWhatsAppInitialization();
              this.addLog('whatsapp-init', data.message, false);
              this.update('whatsapp-init', data.message, data.progress);
          });
          
          // Evento de passo da inicialização
          window.wppInitMonitor.onInitStep((data) => {
              this.addLog('whatsapp-init', data.message, data.completed);
              this.update('whatsapp-init', data.message, data.progress, data.type);
          });
          
          // Evento de erro na inicialização
          window.wppInitMonitor.onInitError((data) => {
              this.addLog('whatsapp-init', data.message, false);
              this.update('whatsapp-init', data.message, null, 'error');
          });
          
          // Evento de inicialização completa
          window.wppInitMonitor.onInitComplete((data) => {
              this.addLog('whatsapp-init', data.message, true);
          });
          
          // Eventos de mudança de estado
          window.wppInitMonitor.onStateChange((data) => {
              this.addLog('whatsapp-init', `Estado da conexão: ${data.state}`, data.state === 'CONNECTED');
          });
          
          // Eventos de mudança de stream
          window.wppInitMonitor.onStreamChange((data) => {
              this.addLog('whatsapp-init', `Estado do stream: ${data.state}`, data.state === 'CONNECTED');
          });

          // Evento para fechar o popup
          window.wppInitMonitor.onStreamChange((data) => {
            this.addLog('whatsapp-init', `Estado do stream: ${data.state}`, data.state === 'CONNECTED');
          });
          
          window.wppInitMonitor.closePopup((data) => {
            this.update('whatsapp-init', 'Whatsapp pronto para conexão!', data.progress, 'success');
              
              // Fechar o toast após 5 segundos
              setTimeout(() => {
                  this.remove('whatsapp-init');
              }, 500);
          });
      }
  },
  
  create(id, title, message, type = 'info') {
      // Garantir que o container exista
      this.ensureContainer();
      
      // Se já existe um toast com este ID, remova-o
      if (this.toasts[id]) {
          this.remove(id);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.id = `toast-${id}`;
      
      let iconName = 'information-circle-outline';
      if (type === 'success') iconName = 'checkmark-circle-outline';
      if (type === 'error') iconName = 'alert-circle-outline';
      if (type === 'warning') iconName = 'warning-outline';
      if (type === 'loading') iconName = 'sync-outline';
      
      toast.innerHTML = `
          <div class="toast-header">
              <div class="toast-title">
                  <ion-icon name="${iconName}"></ion-icon>
                  <span>${title}</span>
              </div>
              <button class="toast-close" onclick="toastSystem.remove('${id}')">
                  <ion-icon name="close-outline"></ion-icon>
              </button>
          </div>
          <div class="toast-body">
              <div class="toast-message">${message}</div>
              ${type === 'loading' || type === 'info' ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' : ''}
              <div class="toast-status ${type}">${this.getStatusMessage(type)}</div>
              <div class="toast-logs" id="toast-logs-${id}"></div>
          </div>
      `;
      
      this.container.appendChild(toast);
      this.toasts[id] = toast;
      
      return toast;
  },
  
  getStatusMessage(type) {
      switch (type) {
          case 'loading': return '<ion-icon name="sync-outline" class="animate-spin"></ion-icon> Inicializando...';
          case 'success': return '<ion-icon name="checkmark-circle-outline"></ion-icon> Concluído';
          case 'error': return '<ion-icon name="alert-circle-outline"></ion-icon> Erro';
          case 'warning': return '<ion-icon name="warning-outline"></ion-icon> Atenção';
          default: return '<ion-icon name="information-circle-outline"></ion-icon> Informação';
      }
  },
  
  update(id, message, progress = null, type = null) {
      const toast = this.toasts[id];
      if (!toast) return;
      
      if (message) {
          const messageEl = toast.querySelector('.toast-message');
          if (messageEl) {
              messageEl.textContent = message;
          }
      }
      
      if (progress !== null) {
          const progressBar = toast.querySelector('.toast-progress-bar');
          if (progressBar) {
              progressBar.style.width = `${progress}%`;
          }
      }
      
      if (type) {
          const statusEl = toast.querySelector('.toast-status');
          if (statusEl) {
              statusEl.className = `toast-status ${type}`;
              statusEl.innerHTML = this.getStatusMessage(type);
          }
          
          const titleIcon = toast.querySelector('.toast-title ion-icon');
          if (titleIcon) {
              let iconName = 'information-circle-outline';
              if (type === 'success') iconName = 'checkmark-circle-outline';
              if (type === 'error') iconName = 'alert-circle-outline';
              if (type === 'warning') iconName = 'warning-outline';
              if (type === 'loading') iconName = 'sync-outline';
              
              titleIcon.setAttribute('name', iconName);
          }
      }
  },
  
  addLog(id, message, completed = false) {
      const toast = this.toasts[id];
      if (!toast) return;
      
      const logsContainer = toast.querySelector(`#toast-logs-${id}`);
      if (!logsContainer) return;
      
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${completed ? 'completed' : ''}`;
      logEntry.textContent = message;
      
      logsContainer.appendChild(logEntry);
      logsContainer.scrollTop = logsContainer.scrollHeight; // Auto-scroll para o último log
  },
  
  remove(id) {
      const toast = this.toasts[id];
      if (!toast) return;
      
      toast.classList.add('hide');
      setTimeout(() => {
          if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
          }
          delete this.toasts[id];
      }, 300);
  },
  
  // Função específica para mostrar o processo de inicialização do WhatsApp
  showWhatsAppInitialization() {
      // Garantir que o container exista
      this.ensureContainer();
      
      const whatsappId = 'whatsapp-init';
      
      // Se já existe um toast, apenas retorne-o
      if (this.toasts[whatsappId]) {
          return this.toasts[whatsappId];
      }
      
      return this.create(whatsappId, 'Inicialização do WhatsApp', 'Acompanhe o processo de inicialização abaixo:', 'loading');
  }
};

// ======= Delivery Mensagens ======== //
window.saveIntentData = (intentKey, intentData) => {
  return window.electronAPI.saveIntent(intentKey, intentData);
};

window.getIntentData = (intentKey) => {
  return window.electronAPI.getIntent(intentKey);
};

// ====== Configurações ========//
window.getConfig = () => {
  return window.electronAPI.getConfig(); 
};

window.saveConfig = (config) => {
  return window.electronAPI.saveConfig(config); 
};

window.updateConfig = (config) => {
  return window.electronAPI.updateConfig(config); 
};

// ====== cliente Wpp ========== //
window.getConnectionStatus = async () => {
  // Chama a função no backend (via ipcRenderer)
  return window.electronAPI.getConnectionStatus();
};

window.getLastUpdate = async () => {
  // Chama a função no backend (via ipcRenderer)
  return window.electronAPI.getLastUpdate();
};

window.getWppDiagnostic = async () => {
  // Chama a função no backend (via ipcRenderer)
  return window.electronAPI.getWppDiagnostic();
};

window.clearConnectionStatus = async () => {
  // Chama a função no backend (via ipcRenderer)
  return window.electronAPI.clearConnectionStatus();
};

window.disconectWpp = async () => {
  // Chama a função no backend (via ipcRenderer)
  return window.electronAPI.disconectWpp();
};

window.repairWpp = async () => {
  return window.repairWpp.repairWpp();
}

window.getDeviceName = async () => {
  // Chama a função no backend (via ipcRenderer)
  return window.electronAPI.getDeviceName();
};

// ======== funções para o histórico de atendimento ========= //
window.updateStatusHistory = (aId, aStatus) => {
  return window.electronAPI.updateStatusHistory(aId, aStatus);
};

window.getHistory = async () => {
  return window.electronAPI.getHistory();
};

// ========= Manipuladores front end ========= //

// Manipuladores para os links
document.getElementById('conexao-link').addEventListener('click', () => {
  fetch('conexao.html')
      .then(response => response.text())
      .then(html => {
          const contentArea = document.getElementById('content-area');

          // Remover scripts antigos antes de atualizar o conteúdo
          contentArea.querySelectorAll('script').forEach(script => script.remove());

          // Criar um container temporário
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          // Substituir o conteúdo sem incluir os scripts diretamente
          contentArea.innerHTML = tempDiv.innerHTML;

          // Remover scripts existentes antes de adicionar novos
          document.querySelectorAll('script[data-dynamic]').forEach(script => script.remove());

          // Executar os scripts corretamente
          tempDiv.querySelectorAll('script').forEach(oldScript => {
              const newScript = document.createElement('script');
              newScript.setAttribute('data-dynamic', 'true'); // Marcar como script dinâmico
            
              if (oldScript.src) {
                  newScript.src = oldScript.src;
                  newScript.onload = () => console.log(`Script carregado: ${oldScript.src}`);

                  
              } else {
                  newScript.textContent = oldScript.textContent;
              }

              document.body.appendChild(newScript);
          });
      })
      .catch(error => {
          console.error('Erro ao carregar o arquivo HTML:', error);
      });
});

document.getElementById('configuracao-link').addEventListener('click', () => {
  fetch('configuracao.html')
      .then(response => response.text())
      .then(html => {
          const contentArea = document.getElementById('content-area');

          // Remover scripts antigos antes de atualizar o conteúdo
          contentArea.querySelectorAll('script').forEach(script => script.remove());

          // Criar um container temporário
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          // Substituir o conteúdo sem incluir os scripts diretamente
          contentArea.innerHTML = tempDiv.innerHTML;

          // Remover scripts existentes antes de adicionar novos
          document.querySelectorAll('script[data-dynamic]').forEach(script => script.remove());

          // Executar os scripts corretamente
          tempDiv.querySelectorAll('script').forEach(oldScript => {
              const newScript = document.createElement('script');
              newScript.setAttribute('data-dynamic', 'true'); // Marcar como script dinâmico

              if (oldScript.src) {
                  newScript.src = oldScript.src;
                  newScript.onload = () => console.log(`Script carregado: ${oldScript.src}`);

                  
              } else {
                  newScript.textContent = oldScript.textContent;
              }

              document.body.appendChild(newScript);
          });
      })
      .catch(error => {
          console.error('Erro ao carregar o arquivo HTML:', error);
      });
});

document.getElementById('usuario-link').addEventListener('click', () => {
  fetch('usuarios.html')
      .then(response => response.text())
      .then(html => {
          const contentArea = document.getElementById('content-area');

          // Remover scripts antigos antes de atualizar o conteúdo
          contentArea.querySelectorAll('script').forEach(script => script.remove());

          // Criar um container temporário
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          // Substituir o conteúdo sem incluir os scripts diretamente
          contentArea.innerHTML = tempDiv.innerHTML;

          // Remover scripts existentes antes de adicionar novos
          document.querySelectorAll('script[data-dynamic]').forEach(script => script.remove());

          // Executar os scripts corretamente
          tempDiv.querySelectorAll('script').forEach(oldScript => {
              const newScript = document.createElement('script');
              newScript.setAttribute('data-dynamic', 'true'); // Marcar como script dinâmico

              if (oldScript.src) {
                  newScript.src = oldScript.src;
                  newScript.onload = () => console.log(`Script carregado: ${oldScript.src}`);

                  
              } else {
                  newScript.textContent = oldScript.textContent;
              }

              document.body.appendChild(newScript);
          });
      })
      .catch(error => {
          console.error('Erro ao carregar o arquivo HTML:', error);
      });
});

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar")
    const toggleButton = document.getElementById("toggle-sidebar")
    const content = document.getElementById("content-area")
  
    function toggleSidebar() {
      sidebar.classList.toggle("collapsed")
      if (sidebar.classList.contains("collapsed")) {
        content.style.marginLeft = "60px"
      } else {
        content.style.marginLeft = "250px"
      }
    }
  
    toggleButton.addEventListener("click", toggleSidebar)
  
    // Adicionar funcionalidade aos links do menu
    const menuLinks = document.querySelectorAll(".sidebar-link")
    menuLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        // Aqui você pode adicionar a lógica para carregar o conteúdo correspondente
        console.log(`Clicou em: ${link.querySelector("span").textContent.trim()}`)
      })
    })
  
    // Ajuste inicial do conteúdo
    content.style.marginLeft = "250px"

    toastSystem.init();
    toastSystem.showWhatsAppInitialization();
})
  
  