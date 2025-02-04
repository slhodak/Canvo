const BurgerMenu = ({ isCollapsed, strokeColor }: { isCollapsed: boolean, strokeColor: string }) => {
  return (
    <svg className={`collapse-button-icon ${isCollapsed ? 'collapsed' : 'expanded'}`} width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18L20 18" stroke={strokeColor} stroke-width="2" stroke-linecap="round" />
      <path d="M4 12L20 12" stroke={strokeColor} stroke-width="2" stroke-linecap="round" />
      <path d="M4 6L20 6" stroke={strokeColor} stroke-width="2" stroke-linecap="round" />
    </svg>

  )
};

export default BurgerMenu;
