/**
 * Estilos visuais da tela de Aparência (Seleção de Tema).
 * Componentes: cards de opções de tema, botões de rádio, cabeçalho.
 * Este arquivo é o ponto central para customização do visual desta tela.
 */

// Os estilos desta tela são definidos inline em tela-aparencia.jsx
// via StyleSheet.create() ao final do arquivo, seguindo o padrão do projeto.

export const OPCOES_TEMA = [
  { id: "system", rotulo: "Automático (Acompanhar Sistema)", icone: "smartphone" },
  { id: "light",  rotulo: "Claro (Fundo Branco)",            icone: "sun"        },
  { id: "dark",   rotulo: "Escuro (Fundo Grafite)",          icone: "moon"       },
  { id: "oled",   rotulo: "Preto Absoluto (OLED #000000)",   icone: "monitor"    },
];
