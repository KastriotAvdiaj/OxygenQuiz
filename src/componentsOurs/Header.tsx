import { useState, useEffect } from "react";
import { DrawerFilled } from "./DrawerFilled";
import { NavLink } from "react-router-dom";

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
    <header
      className={`fixed top-0 left-0 bg-[var(--background-secondary)] right-0 z-50 text-lg shadow-md h-16 grid grid-cols-5 items-center px-4 transition-transform duration-400 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="col-span-1">
        <ul className="flex gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "font-bold border-b-2 border-[var(--border)]"
                : "hover:border-b-2 hover:border-[var(--border)]"
            }
          >
            <li className="cursor-pointer">Home</li>
          </NavLink>
          <NavLink
            to="/about-us"
            className={({ isActive }) =>
              isActive
                ? "font-bold border-b-2 border-[var(--border)]"
                : "hover:border-b-2 hover:border-[var(--border)]"
            }
          >
            <li className="cursor-pointer">About Us</li>
          </NavLink>
        </ul>
      </div>
      <div className="col-span-3 flex justify-center">
        <p className="text-3xl font-bold">OXYGEN</p>
      </div>
      <div className="col-span-1 flex justify-end">
        <DrawerFilled />
      </div>
    </header>
  );
};

export default Header;
