const notyf = new Notyf({
  duration: 2000, // Tempo de exibição
  position: { x: 'right', y: 'top' }, // Posição do toast
  dismissible: true,
});

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
})
  
  