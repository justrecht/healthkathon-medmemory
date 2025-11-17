declare module "hugeicons-react-native" {
  import { ComponentType } from "react";
    import { SvgProps } from "react-native-svg";

  type HugeIconProps = SvgProps & {
    size?: number;
    variant?: "stroke" | "solid" | "bulk";
  };

  type HugeIcon = ComponentType<HugeIconProps>;

  export const AlarmClockIcon: HugeIcon;
  export const Calendar01Icon: HugeIcon;
  export const DarkModeIcon: HugeIcon;
  export const HeartAddIcon: HugeIcon;
  export const Home01Icon: HugeIcon;
  export const MedicineBottle01Icon: HugeIcon;
  export const Notification01Icon: HugeIcon;
  export const ReminderIcon: HugeIcon;
  export const SecurityIcon: HugeIcon;
  export const Settings01Icon: HugeIcon;
  export const Shield01Icon: HugeIcon;
  export const UserCircleIcon: HugeIcon;
  export const UserStar01Icon: HugeIcon;
}
