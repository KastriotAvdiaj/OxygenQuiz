import { useState, useEffect } from "react";
import { DrawerFilled } from "./DrawerFilled";
import { NavLink } from "react-router-dom";
import { HeaderComponent } from "./HeaderComponent";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Divider } from "./Divider";

const Header = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY > lastScrollY) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <HeaderComponent
      className={`fixed top-0 left-0 bg-[var(--background-secondary)] right-0 z-50 text-lg shadow-md h-16 grid grid-cols-5 items-center px-4 transition-transform duration-400 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="col-span-1">
        <ul className="flex gap-4 font-bold">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "text-[var(--text-hover)]"
                : "hover:text-[var(--text-hover)]"
            }
          >
            <li className="cursor-pointer">Home</li>
          </NavLink>
          <NavLink
            to="/about-us"
            className={({ isActive }) =>
              isActive
                ? "text-[var(--text-hover)]"
                : "hover:text-[var(--text-hover)]"
            }
          >
            <li className="cursor-pointer">About Us</li>
          </NavLink>
        </ul>
      </div>
      <div className="col-span-3 flex justify-center">
        <p className="text-3xl font-bold text-[var(--text-hover)]">OXYGEN</p>
      </div>
      <div className="col-span-1 flex justify-end items-center gap-3">
        <ModeToggle className="rounded-[2rem] px-2" />
        <Divider orientation="vertical" thickness="1px" length="24px" />
        <DrawerFilled />
      </div>
    </HeaderComponent>
  );
};

export default Header;