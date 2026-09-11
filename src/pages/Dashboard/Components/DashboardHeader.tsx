import { DrawerFilled } from "@/common/Custom-Drawer/DrawerFilled";
import { Divider } from "@/common/Divider";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { HeaderComponent } from "@/common/HeaderComponent";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The dashboard's top bar. It has to survive 390px, where it previously did not: a `text-5xl`
 * wordmark plus five labelled controls needs ~560px, and `HeaderComponent` is a plain
 * `justify-between` flex row with nothing to wrap or scroll, so the surplus simply left the
 * screen — the account drawer and theme toggle were pushed off the right edge and became
 * unreachable on a phone. Nothing was clipped visibly enough to look like a bug; the controls
 * were just gone.
 *
 * Two ideas do the work:
 *
 * - **The wordmark is display type**, so it scales with width (docs/RESPONSIVE.md, "Width
 *   scales layout and display type"). 48px of branding on a 390px screen is a third of the
 *   width spent saying what app you are already in. It is also the row's shrinkable member,
 *   so a width this row cannot satisfy costs letters off the logo rather than half of the
 *   account button.
 * - **The controls are not.** Their height and hit area stay put at every width — a finger
 *   is the same size on both devices. What goes on phones is their *labels*, not their size:
 *   Back and Home are icon-first buttons whose text appears from `sm` up, and each keeps an
 *   `aria-label` so the icon-only state still announces itself.
 */
export const DashboardHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => {
    if (location.pathname.includes("redirect")) {
      navigate(-2);
    } else {
      navigate(-1);
    }
  };

  return (
    <HeaderComponent className="shadow-md border-b border-border z-8 relative gap-2 overflow-hidden">
      {/* The wordmark is the element that gives way, and making it do so takes BOTH halves:
          `min-w-0` on the flex item (a flex child refuses to shrink below its content
          otherwise) and `truncate` on the text itself. "OXYGEN" is a single unbreakable
          word, so without `truncate` its min-content width is the whole word and the item
          cannot shrink no matter what `min-w-0` says — the surplus then lands on the far
          end of the row, which is why the account button was the thing cut in half.
          With both, the branding loses a letter before any control loses a pixel. */}
      <div className="flex min-w-0 flex-col items-center p-1.5 sm:p-2">
        <p className="text-foreground truncate px-2 pt-1 text-2xl font-bold italic sm:px-6 sm:pt-3 sm:text-4xl lg:text-5xl">
          OXYGEN
        </p>
        {/* <p className="text-2xl">Dashboard</p>  */}
      </div>
      {/* shrink-0: the controls are the part of this row you cannot do without. */}
      <div className="bg-background flex shrink-0 items-center justify-end gap-1 px-1.5 sm:gap-3 sm:px-4">
        <Button
          variant={"outline"}
          className="rounded-sm px-2 sm:px-4"
          onClick={goBack}
          aria-label="Go back"
        >
          <Undo2 size={20} />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <NavLink to="/">
          <Button
            variant={"outline"}
            className="rounded-sm px-2 sm:px-4"
            aria-label="Home"
          >
            <Home size={20} />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </NavLink>

        {/* The dividers separate groups that are only distinguishable once the buttons carry
            labels. Icon-only, they are three more vertical lines in a row of icons. */}
        <span className="hidden sm:block">
          <Divider orientation="vertical" thickness="1px" length="24px" />
        </span>
        <ModeToggle className="rounded-[2rem] px-2" />
        <span className="hidden sm:block">
          <Divider orientation="vertical" thickness="1px" length="24px" />
        </span>
        <DrawerFilled />
      </div>
    </HeaderComponent>
  );
};
